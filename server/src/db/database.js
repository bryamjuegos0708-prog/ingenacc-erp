import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDirectory, "../../..");
const defaultDatabasePath = path.resolve(moduleDirectory, "../../data/ingenacc.db");

const migrations = [
  {
    version: 1,
    name: "catalog_security",
    sql: `
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS company (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        legal_name TEXT NOT NULL,
        trade_name TEXT NOT NULL,
        ruc TEXT NOT NULL UNIQUE,
        address TEXT NOT NULL,
        tax_rate REAL NOT NULL CHECK (tax_rate >= 0),
        currency TEXT NOT NULL,
        electronic_billing INTEGER NOT NULL CHECK (electronic_billing IN (0, 1)),
        billing_notice TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS document_series (
        type TEXT PRIMARY KEY,
        prefix TEXT NOT NULL,
        next_value INTEGER NOT NULL CHECK (next_value > 0)
      );

      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        store_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        detail TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('TIENDA', 'ALMACEN')),
        active INTEGER NOT NULL CHECK (active IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        barcode TEXT NOT NULL UNIQUE,
        manufacturer_code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        sector TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        unit TEXT NOT NULL,
        cost_price REAL NOT NULL CHECK (cost_price >= 0),
        price REAL NOT NULL CHECK (price > 0),
        min_stock INTEGER NOT NULL CHECK (min_stock >= 0),
        power TEXT NOT NULL,
        fuel TEXT NOT NULL,
        origin TEXT NOT NULL,
        warranty TEXT NOT NULL,
        active INTEGER NOT NULL CHECK (active IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS inventory_stock (
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity >= 0),
        PRIMARY KEY (product_id, location_id)
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        document_type TEXT NOT NULL CHECK (document_type IN ('DNI', 'RUC', 'CE')),
        document_number TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        active INTEGER NOT NULL CHECK (active IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        document_type TEXT NOT NULL CHECK (document_type IN ('RUC', 'DNI', 'OTRO')),
        document_number TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        contact TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        active INTEGER NOT NULL CHECK (active IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        role TEXT NOT NULL CHECK (role IN ('GERENTE', 'ADMINISTRACION', 'VENTAS', 'ALMACEN')),
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        password_hash TEXT NOT NULL
      );
    `
  },
  {
    version: 2,
    name: "commercial_operations",
    sql: `
      CREATE TABLE IF NOT EXISTS cash_sessions (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL UNIQUE,
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        opened_by TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        opening_amount REAL NOT NULL CHECK (opening_amount >= 0),
        status TEXT NOT NULL CHECK (status IN ('ABIERTA', 'CERRADA')),
        closed_at TEXT,
        closed_by TEXT,
        counted_amount REAL,
        expected_amount REAL,
        difference REAL
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL UNIQUE,
        document_type TEXT NOT NULL CHECK (document_type IN ('FACTURA', 'BOLETA', 'NOTA_VENTA')),
        date TEXT NOT NULL,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        cash_session_id TEXT REFERENCES cash_sessions(id) ON DELETE RESTRICT,
        subtotal REAL NOT NULL CHECK (subtotal >= 0),
        tax REAL NOT NULL CHECK (tax >= 0),
        total REAL NOT NULL CHECK (total >= 0),
        paid REAL NOT NULL CHECK (paid >= 0),
        balance REAL NOT NULL CHECK (balance >= 0),
        payment_status TEXT NOT NULL CHECK (payment_status IN ('PAGADO', 'PARCIAL', 'PENDIENTE')),
        billing_status TEXT NOT NULL,
        seller TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price REAL NOT NULL CHECK (unit_price >= 0),
        PRIMARY KEY (invoice_id, line_number)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
        cash_session_id TEXT NOT NULL REFERENCES cash_sessions(id) ON DELETE RESTRICT,
        date TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        method TEXT NOT NULL,
        reference TEXT NOT NULL,
        received_by TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        subtotal REAL NOT NULL CHECK (subtotal >= 0),
        tax REAL NOT NULL CHECK (tax >= 0),
        total REAL NOT NULL CHECK (total >= 0),
        status TEXT NOT NULL CHECK (status IN ('PENDIENTE', 'RECIBIDA')),
        reference TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_by TEXT NOT NULL,
        received_at TEXT,
        received_by TEXT
      );

      CREATE TABLE IF NOT EXISTS purchase_items (
        purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_cost REAL NOT NULL CHECK (unit_cost > 0),
        PRIMARY KEY (purchase_id, line_number)
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        from_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        to_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        reason TEXT NOT NULL,
        responsible TEXT NOT NULL,
        status TEXT NOT NULL,
        CHECK (from_location_id <> to_location_id)
      );

      CREATE TABLE IF NOT EXISTS sale_returns (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        reason TEXT NOT NULL,
        return_to_stock INTEGER NOT NULL CHECK (return_to_stock IN (0, 1)),
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        amount REAL NOT NULL CHECK (amount >= 0),
        refund_status TEXT NOT NULL,
        responsible TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SALIDA', 'TRASLADO', 'AJUSTE')),
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        from_location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT,
        to_location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT,
        reason TEXT NOT NULL,
        responsible TEXT NOT NULL,
        document TEXT NOT NULL,
        balance_after INTEGER
      );

      CREATE TABLE IF NOT EXISTS cash_movements (
        id TEXT PRIMARY KEY,
        cash_session_id TEXT NOT NULL REFERENCES cash_sessions(id) ON DELETE RESTRICT,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('INGRESO', 'EGRESO')),
        amount REAL NOT NULL CHECK (amount > 0),
        method TEXT NOT NULL,
        concept TEXT NOT NULL,
        reference TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT,
        responsible TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        detail TEXT NOT NULL
      );
    `
  },
  {
    version: 3,
    name: "indexes_views",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
      CREATE INDEX IF NOT EXISTS idx_products_sector ON products(sector);
      CREATE INDEX IF NOT EXISTS idx_stock_location ON inventory_stock(location_id);
      CREATE INDEX IF NOT EXISTS idx_movements_date ON inventory_movements(date DESC);
      CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date DESC);
      CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(date DESC);
      CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(cash_session_id, date DESC);

      CREATE VIEW IF NOT EXISTS stock_totals AS
        SELECT product_id, COALESCE(SUM(quantity), 0) AS total_stock
        FROM inventory_stock
        GROUP BY product_id;

      CREATE VIEW IF NOT EXISTS open_cash_sessions AS
        SELECT * FROM cash_sessions WHERE status = 'ABIERTA';
    `
  }
  ,{
    version: 4,
    name: "partial_receipts",
    sql: `
      ALTER TABLE purchase_items ADD COLUMN received_quantity INTEGER NOT NULL DEFAULT 0 CHECK(received_quantity >= 0 AND received_quantity <= quantity);
      UPDATE purchase_items SET received_quantity = quantity WHERE purchase_id IN (SELECT id FROM purchases WHERE status = 'RECIBIDA');
      CREATE TABLE purchase_receipts (
        id TEXT PRIMARY KEY,
        purchase_id TEXT NOT NULL REFERENCES purchases(id),
        date TEXT NOT NULL,
        responsible TEXT NOT NULL,
        items TEXT NOT NULL
      );
    `
  }
  ,{
    version: 5,
    name: "physical_counts_and_revocation",
    sql: `
      CREATE TABLE physical_counts (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id),
        location_id TEXT NOT NULL REFERENCES locations(id),
        expected INTEGER NOT NULL CHECK(expected >= 0),
        counted INTEGER NOT NULL CHECK(counted >= 0),
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PENDIENTE','APROBADO','RECHAZADO')),
        reviewed_at TEXT,
        reviewed_by TEXT
      );
      CREATE TABLE revoked_tokens (id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    `
  }
  ,{version:6,name:"business_rules",sql:`
    ALTER TABLE users ADD COLUMN authority_role TEXT CHECK(authority_role IS NULL OR authority_role='JEFE');
    ALTER TABLE invoices ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'ENTREGADO' CHECK(delivery_status IN ('RESERVADO','ENTREGADO'));
    ALTER TABLE invoices ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0 CHECK(discount_amount >= 0);
    CREATE TABLE equipment (id TEXT PRIMARY KEY,serial TEXT NOT NULL UNIQUE COLLATE NOCASE,payload TEXT NOT NULL);
    CREATE TABLE service_cases (id TEXT PRIMARY KEY,equipment_id TEXT NOT NULL REFERENCES equipment(id),payload TEXT NOT NULL);
    INSERT OR IGNORE INTO brands VALUES ('bonhofer','Bonhofer','CONFIRMADA','MULTIMARCA');
    INSERT OR IGNORE INTO brands VALUES ('italika','Italika','CONFIRMADA','MULTIMARCA');
    INSERT OR IGNORE INTO brands VALUES ('makita','Makita','CONFIRMADA','MULTIMARCA');
  `}
, {version:7,name:"customer_proformas_orders",sql:`
 CREATE TABLE proformas (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
 CREATE TABLE customer_orders (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
 UPDATE brands SET name='Bonhoeffer' WHERE name='Bonhofer';
 UPDATE products SET brand='Bonhoeffer' WHERE brand='Bonhofer';
 `}
];

let connection;
let activePath;

export function applyMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const applied = new Set(database.prepare("SELECT version FROM schema_migrations").all().map((row) => Number(row.version)));
  const insert = database.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)");
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(migration.sql);
      insert.run(migration.version, migration.name, new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}

export function getDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH;
  if (!configuredPath) return defaultDatabasePath;
  return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(projectRoot, configuredPath);
}

export function getDatabase() {
  const requestedPath = getDatabasePath();
  if (connection) {
    if (requestedPath !== activePath) throw new Error("DATABASE_PATH no puede cambiar mientras el servidor está activo.");
    return connection;
  }
  fs.mkdirSync(path.dirname(requestedPath), { recursive:true });
  connection = new DatabaseSync(requestedPath);
  activePath = requestedPath;
  connection.exec("PRAGMA foreign_keys = ON");
  connection.exec("PRAGMA journal_mode = WAL");
  connection.exec("PRAGMA synchronous = NORMAL");
  connection.exec("PRAGMA busy_timeout = 5000");
  applyMigrations(connection);
  return connection;
}

export function closeDatabase() {
  if (!connection) return;
  connection.close();
  connection = undefined;
  activePath = undefined;
}

export function serializeDatabase() {
  const database = getDatabase();
  database.exec("PRAGMA wal_checkpoint(FULL)");
  return Buffer.from(database.serialize());
}

export function databaseHealth() {
  const database = getDatabase();
  const integrity = database.prepare("PRAGMA integrity_check").get()?.integrity_check || "unknown";
  const foreignKeyErrors = database.prepare("PRAGMA foreign_key_check").all();
  const journalMode = database.prepare("PRAGMA journal_mode").get()?.journal_mode || "unknown";
  const migrationsApplied = Number(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get()?.count || 0);
  return { integrity, foreignKeyErrors, journalMode, migrationsApplied };
}
