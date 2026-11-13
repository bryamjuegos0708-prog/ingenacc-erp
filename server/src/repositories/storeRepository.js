const nil = (value) => value === undefined ? null : value;
const bool = (value) => value ? 1 : 0;
const asBool = (value) => Boolean(value);

function rowsByParent(rows, parentKey, mapper) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row[parentKey];
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(mapper(row));
  }
  return grouped;
}

export class StoreRepository {
  constructor(database) {
    this.database = database;
  }

  isEmpty() {
    return Number(this.database.prepare("SELECT COUNT(*) AS count FROM company").get()?.count || 0) === 0;
  }

  readSnapshot() {
    const company = this.database.prepare("SELECT * FROM company WHERE id = 1").get();
    if (!company) return null;

    const locations = this.database.prepare("SELECT * FROM locations ORDER BY rowid").all().map((row) => ({
      id: row.id,
      name: row.name,
      detail: row.detail,
      kind: row.kind,
      active: asBool(row.active)
    }));
    const locationIds = locations.map((location) => location.id);
    const stock = new Map();
    for (const row of this.database.prepare("SELECT product_id, location_id, quantity FROM inventory_stock").all()) {
      if (!stock.has(row.product_id)) stock.set(row.product_id, Object.fromEntries(locationIds.map((id) => [id, 0])));
      stock.get(row.product_id)[row.location_id] = Number(row.quantity);
    }

    const invoiceItems = rowsByParent(
      this.database.prepare("SELECT * FROM invoice_items ORDER BY invoice_id, line_number").all(),
      "invoice_id",
      (row) => ({ productId:row.product_id, quantity:Number(row.quantity), unitPrice:Number(row.unit_price) })
    );
    const purchaseItems = rowsByParent(
      this.database.prepare("SELECT * FROM purchase_items ORDER BY purchase_id, line_number").all(),
      "purchase_id",
      (row) => ({ productId:row.product_id, quantity:Number(row.quantity), unitCost:Number(row.unit_cost), receivedQuantity:Number(row.received_quantity) })
    );

    const series = Object.fromEntries(this.database.prepare("SELECT * FROM document_series ORDER BY rowid").all().map((row) => [
      row.type,
      { prefix:row.prefix, next:Number(row.next_value) }
    ]));

    return {
      proformas: this.database.prepare("SELECT payload FROM proformas ORDER BY rowid").all().map(r=>JSON.parse(r.payload)),
      customerOrders: this.database.prepare("SELECT payload FROM customer_orders ORDER BY rowid").all().map(r=>JSON.parse(r.payload)),
      demoMode: this.database.prepare("SELECT value FROM app_metadata WHERE key = 'demo_mode'").get()?.value === "true",
      schemaVersion: Number(this.database.prepare("SELECT value FROM app_metadata WHERE key = 'schema_version'").get()?.value || 4),
      company: {
        legalName: company.legal_name,
        tradeName: company.trade_name,
        ruc: company.ruc,
        address: company.address,
        taxRate: Number(company.tax_rate),
        currency: company.currency,
        electronicBilling: asBool(company.electronic_billing),
        billingNotice: company.billing_notice
      },
      equipment:this.database.prepare("SELECT payload FROM equipment ORDER BY rowid").all().map(r=>JSON.parse(r.payload)),
      serviceCases:this.database.prepare("SELECT payload FROM service_cases ORDER BY rowid").all().map(r=>JSON.parse(r.payload)),
      series,
      physicalCounts: this.database.prepare("SELECT * FROM physical_counts ORDER BY created_at DESC").all().map((row) => ({id:row.id, productId:row.product_id, locationId:row.location_id, expected:row.expected, counted:row.counted, reason:row.reason, createdAt:row.created_at, createdBy:row.created_by, status:row.status, reviewedAt:row.reviewed_at, reviewedBy:row.reviewed_by})),
      purchaseReceipts: this.database.prepare("SELECT * FROM purchase_receipts ORDER BY date DESC").all().map((row) => ({ id:row.id, purchaseId:row.purchase_id, date:row.date, responsible:row.responsible, items:JSON.parse(row.items) })),
      brands: this.database.prepare("SELECT * FROM brands ORDER BY rowid").all().map((row) => ({
        id:row.id, name:row.name, status:row.status, storeType:row.store_type
      })),
      locations,
      products: this.database.prepare("SELECT * FROM products ORDER BY rowid").all().map((row) => ({
        id:row.id,
        code:row.code,
        barcode:row.barcode,
        manufacturerCode:row.manufacturer_code,
        name:row.name,
        description:row.description,
        brand:row.brand,
        model:row.model,
        sector:row.sector,
        category:row.category,
        subcategory:row.subcategory,
        unit:row.unit,
        costPrice:Number(row.cost_price),
        price:Number(row.price),
        minStock:Number(row.min_stock),
        stock:stock.get(row.id) || Object.fromEntries(locationIds.map((id) => [id, 0])),
        power:row.power,
        fuel:row.fuel,
        origin:row.origin,
        warranty:row.warranty,
        active:asBool(row.active)
      })),
      clients: this.database.prepare("SELECT * FROM clients ORDER BY rowid").all().map((row) => ({
        id:row.id,
        documentType:row.document_type,
        documentNumber:row.document_number,
        name:row.name,
        phone:row.phone,
        email:row.email,
        address:row.address,
        active:asBool(row.active)
      })),
      suppliers: this.database.prepare("SELECT * FROM suppliers ORDER BY rowid").all().map((row) => ({
        id:row.id,
        documentType:row.document_type,
        documentNumber:row.document_number,
        name:row.name,
        contact:row.contact,
        phone:row.phone,
        email:row.email,
        address:row.address,
        active:asBool(row.active)
      })),
      movements: this.database.prepare("SELECT * FROM inventory_movements ORDER BY rowid").all().map((row) => ({
        id:row.id,
        date:row.date,
        type:row.type,
        productId:row.product_id,
        quantity:Number(row.quantity),
        from:row.from_location_id,
        to:row.to_location_id,
        reason:row.reason,
        responsible:row.responsible,
        document:row.document,
        balanceAfter:row.balance_after === null ? null : Number(row.balance_after)
      })),
      invoices: this.database.prepare("SELECT * FROM invoices ORDER BY rowid").all().map((row) => ({
        id:row.id,
        number:row.number,
        documentType:row.document_type,
        date:row.date,
        clientId:row.client_id,
        locationId:row.location_id,
        cashSessionId:row.cash_session_id,
        items:invoiceItems.get(row.id) || [],
        subtotal:Number(row.subtotal),
        tax:Number(row.tax),
        total:Number(row.total),
        paid:Number(row.paid),
        balance:Number(row.balance),
        paymentStatus:row.payment_status,
        billingStatus:row.billing_status,deliveryStatus:row.delivery_status,discountAmount:Number(row.discount_amount),
        seller:row.seller
      })),
      payments: this.database.prepare("SELECT * FROM payments ORDER BY rowid").all().map((row) => ({
        id:row.id,
        invoiceId:row.invoice_id,
        cashSessionId:row.cash_session_id,
        date:row.date,
        amount:Number(row.amount),
        method:row.method,
        reference:row.reference,
        receivedBy:row.received_by
      })),
      purchases: this.database.prepare("SELECT * FROM purchases ORDER BY rowid").all().map((row) => ({
        id:row.id,
        number:row.number,
        date:row.date,
        supplierId:row.supplier_id,
        locationId:row.location_id,
        items:purchaseItems.get(row.id) || [],
        subtotal:Number(row.subtotal),
        tax:Number(row.tax),
        total:Number(row.total),
        status:row.status,
        reference:row.reference,
        notes:row.notes,
        createdBy:row.created_by,
        receivedAt:row.received_at,
        receivedBy:row.received_by
      })),
      transfers: this.database.prepare("SELECT * FROM transfers ORDER BY rowid").all().map((row) => ({
        id:row.id,
        number:row.number,
        date:row.date,
        productId:row.product_id,
        quantity:Number(row.quantity),
        from:row.from_location_id,
        to:row.to_location_id,
        reason:row.reason,
        responsible:row.responsible,
        status:row.status
      })),
      returns: this.database.prepare("SELECT * FROM sale_returns ORDER BY rowid").all().map((row) => ({
        id:row.id,
        number:row.number,
        date:row.date,
        invoiceId:row.invoice_id,
        productId:row.product_id,
        quantity:Number(row.quantity),
        reason:row.reason,
        returnToStock:asBool(row.return_to_stock),
        locationId:row.location_id,
        amount:Number(row.amount),
        refundStatus:row.refund_status,
        responsible:row.responsible
      })),
      cashSessions: this.database.prepare("SELECT * FROM cash_sessions ORDER BY rowid").all().map((row) => ({
        id:row.id,
        number:row.number,
        locationId:row.location_id,
        userId:row.user_id,
        openedBy:row.opened_by,
        openedAt:row.opened_at,
        openingAmount:Number(row.opening_amount),
        status:row.status,
        closedAt:row.closed_at,
        closedBy:row.closed_by,
        countedAmount:row.counted_amount === null ? null : Number(row.counted_amount),
        expectedAmount:row.expected_amount === null ? null : Number(row.expected_amount),
        difference:row.difference === null ? null : Number(row.difference)
      })),
      cashMovements: this.database.prepare("SELECT * FROM cash_movements ORDER BY rowid").all().map((row) => ({
        id:row.id,
        cashSessionId:row.cash_session_id,
        date:row.date,
        type:row.type,
        amount:Number(row.amount),
        method:row.method,
        concept:row.concept,
        reference:row.reference,
        sourceType:row.source_type,
        sourceId:row.source_id,
        responsible:row.responsible
      })),
      users: this.database.prepare("SELECT * FROM users ORDER BY rowid").all().map((row) => ({
        id:row.id,
        name:row.name,
        email:row.email,
        role:row.authority_role || row.role,
        locationId:row.location_id,
        active:asBool(row.active),
        passwordHash:row.password_hash
      })),
      quotes: this.database.prepare("SELECT * FROM quotes ORDER BY rowid").all().map((row) => ({
        id:row.id, date:row.date, name:row.name, phone:row.phone, message:row.message, status:row.status
      })),
      audit: this.database.prepare("SELECT * FROM audit_log ORDER BY rowid").all().map((row) => ({
        id:row.id,
        date:row.date,
        userId:row.user_id,
        userName:row.user_name,
        action:row.action,
        entity:row.entity,
        entityId:row.entity_id,
        detail:row.detail
      }))
    };
  }

  replaceSnapshot(snapshot) {
    const database = this.database;
    const removeOrder = [
      "customer_orders", "proformas", "service_cases", "equipment", "physical_counts", "audit_log", "quotes", "cash_movements", "sale_returns", "transfers", "payments",
      "purchase_receipts", "purchase_items", "purchases", "invoice_items", "invoices", "inventory_movements",
      "inventory_stock", "cash_sessions", "users", "products", "suppliers", "clients",
      "locations", "brands", "document_series", "company", "app_metadata"
    ];

    database.exec("BEGIN IMMEDIATE");
    try {
      for (const table of removeOrder) database.exec(`DELETE FROM ${table}`);

      database.prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)").run("schema_version", String(snapshot.schemaVersion || 4));
      database.prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)").run("demo_mode", String(Boolean(snapshot.demoMode)));
      database.prepare(`INSERT INTO company
        (id, legal_name, trade_name, ruc, address, tax_rate, currency, electronic_billing, billing_notice)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(snapshot.company.legalName, snapshot.company.tradeName, snapshot.company.ruc, snapshot.company.address,
          snapshot.company.taxRate, snapshot.company.currency, bool(snapshot.company.electronicBilling), snapshot.company.billingNotice);

      const insertSeries = database.prepare("INSERT INTO document_series (type, prefix, next_value) VALUES (?, ?, ?)");
      for (const [type, series] of Object.entries(snapshot.series || {})) insertSeries.run(type, series.prefix, series.next);

      const insertBrand = database.prepare("INSERT INTO brands (id, name, status, store_type) VALUES (?, ?, ?, ?)");
      for (const item of snapshot.brands || []) insertBrand.run(item.id, item.name, item.status, item.storeType);

      const insertLocation = database.prepare("INSERT INTO locations (id, name, detail, kind, active) VALUES (?, ?, ?, ?, ?)");
      for (const item of snapshot.locations || []) insertLocation.run(item.id, item.name, item.detail, item.kind, bool(item.active));

      const insertProduct = database.prepare(`INSERT INTO products
        (id, code, barcode, manufacturer_code, name, description, brand, model, sector, category, subcategory,
          unit, cost_price, price, min_stock, power, fuel, origin, warranty, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const insertStock = database.prepare("INSERT INTO inventory_stock (product_id, location_id, quantity) VALUES (?, ?, ?)");
      for (const item of snapshot.products || []) {
        insertProduct.run(item.id, item.code, item.barcode, item.manufacturerCode || "", item.name, item.description || "",
          item.brand, item.model, item.sector, item.category, item.subcategory || "", item.unit, item.costPrice, item.price,
          item.minStock, item.power || "", item.fuel || "", item.origin || "", item.warranty || "", bool(item.active));
        for (const location of snapshot.locations || []) insertStock.run(item.id, location.id, Number(item.stock?.[location.id] || 0));
      }

      const insertClient = database.prepare(`INSERT INTO clients
        (id, document_type, document_number, name, phone, email, address, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.clients || []) insertClient.run(item.id, item.documentType, item.documentNumber, item.name, item.phone, item.email, item.address, bool(item.active));

      const insertSupplier = database.prepare(`INSERT INTO suppliers
        (id, document_type, document_number, name, contact, phone, email, address, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.suppliers || []) insertSupplier.run(item.id, item.documentType, item.documentNumber, item.name, item.contact, item.phone, item.email, item.address, bool(item.active));

      const insertUser = database.prepare(`INSERT INTO users
        (id, name, email, role, location_id, active, password_hash, authority_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.users || []) insertUser.run(item.id, item.name, item.email,item.role === "JEFE" ? "ADMINISTRACION" : item.role,item.locationId,bool(item.active),item.passwordHash,item.role === "JEFE" ? "JEFE" : null);

      const insertCashSession = database.prepare(`INSERT INTO cash_sessions
        (id, number, location_id, user_id, opened_by, opened_at, opening_amount, status, closed_at, closed_by, counted_amount, expected_amount, difference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.cashSessions || []) insertCashSession.run(item.id, item.number, item.locationId, item.userId,
        item.openedBy, item.openedAt, item.openingAmount, item.status, nil(item.closedAt), nil(item.closedBy), nil(item.countedAmount),
        nil(item.expectedAmount), nil(item.difference));

      const insertInvoice = database.prepare(`INSERT INTO invoices
        (id, number, document_type, date, client_id, location_id, cash_session_id, subtotal, tax, total, paid, balance, payment_status, billing_status, seller)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const insertInvoiceItem = database.prepare("INSERT INTO invoice_items (invoice_id, line_number, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)");
      for (const item of snapshot.invoices || []) {
        insertInvoice.run(item.id, item.number, item.documentType, item.date, item.clientId, item.locationId, nil(item.cashSessionId),
          item.subtotal, item.tax, item.total, item.paid, item.balance, item.paymentStatus, item.billingStatus, item.seller);
        (item.items || []).forEach((line, index) => insertInvoiceItem.run(item.id, index + 1, line.productId, line.quantity, line.unitPrice));
      }

      const updateInvoice=database.prepare("UPDATE invoices SET delivery_status=?,discount_amount=? WHERE id=?");
      for(const i of snapshot.invoices || []) updateInvoice.run(i.deliveryStatus || "ENTREGADO",i.discountAmount || 0,i.id);
      const insertEquipment=database.prepare("INSERT INTO equipment VALUES (?,?,?)");
      for(const i of snapshot.equipment || []) insertEquipment.run(i.id,i.serial,JSON.stringify(i));
      const insertService=database.prepare("INSERT INTO service_cases VALUES (?,?,?)");
      for(const i of snapshot.serviceCases || []) insertService.run(i.id,i.equipmentId,JSON.stringify(i));
      const insertPayment = database.prepare(`INSERT INTO payments
        (id, invoice_id, cash_session_id, date, amount, method, reference, received_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.payments || []) insertPayment.run(item.id, item.invoiceId, item.cashSessionId, item.date, item.amount, item.method, item.reference, item.receivedBy);

      const insertPurchase = database.prepare(`INSERT INTO purchases
        (id, number, date, supplier_id, location_id, subtotal, tax, total, status, reference, notes, created_by, received_at, received_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const insertPurchaseItem = database.prepare("INSERT INTO purchase_items (purchase_id, line_number, product_id, quantity, unit_cost, received_quantity) VALUES (?, ?, ?, ?, ?, ?)");
      for (const item of snapshot.purchases || []) {
        insertPurchase.run(item.id, item.number, item.date, item.supplierId, item.locationId, item.subtotal, item.tax, item.total,
          item.status, item.reference, item.notes, item.createdBy, nil(item.receivedAt), nil(item.receivedBy));
        (item.items || []).forEach((line, index) => insertPurchaseItem.run(item.id, index + 1, line.productId, line.quantity, line.unitCost, line.receivedQuantity ?? (item.status === "RECIBIDA" ? line.quantity : 0)));
      }
      const insertReceipt = database.prepare("INSERT INTO purchase_receipts (id, purchase_id, date, responsible, items) VALUES (?, ?, ?, ?, ?)");
      for (const item of snapshot.purchaseReceipts || []) insertReceipt.run(item.id, item.purchaseId, item.date, item.responsible, JSON.stringify(item.items));

      const insertTransfer = database.prepare(`INSERT INTO transfers
        (id, number, date, product_id, quantity, from_location_id, to_location_id, reason, responsible, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.transfers || []) insertTransfer.run(item.id, item.number, item.date, item.productId, item.quantity, item.from, item.to, item.reason, item.responsible, item.status);

      const insertReturn = database.prepare(`INSERT INTO sale_returns
        (id, number, date, invoice_id, product_id, quantity, reason, return_to_stock, location_id, amount, refund_status, responsible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.returns || []) insertReturn.run(item.id, item.number, item.date, item.invoiceId, item.productId,
        item.quantity, item.reason, bool(item.returnToStock), item.locationId, item.amount, item.refundStatus, item.responsible);

      const insertMovement = database.prepare(`INSERT INTO inventory_movements
        (id, date, type, product_id, quantity, from_location_id, to_location_id, reason, responsible, document, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.movements || []) insertMovement.run(item.id, item.date, item.type, item.productId, item.quantity,
        nil(item.from), nil(item.to), item.reason, item.responsible, item.document, nil(item.balanceAfter));

      const insertCashMovement = database.prepare(`INSERT INTO cash_movements
        (id, cash_session_id, date, type, amount, method, concept, reference, source_type, source_id, responsible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.cashMovements || []) insertCashMovement.run(item.id, item.cashSessionId, item.date, item.type,
        item.amount, item.method, item.concept, item.reference, item.sourceType, nil(item.sourceId), item.responsible);

      for (const [table,key] of [["proformas","proformas"],["customer_orders","customerOrders"]]) {
        const insert = database.prepare(`INSERT INTO ${table} (id,payload) VALUES (?,?)`);
        for(const item of snapshot[key] || []) insert.run(item.id,JSON.stringify(item));
      }
      const insertQuote = database.prepare("INSERT INTO quotes (id, date, name, phone, message, status) VALUES (?, ?, ?, ?, ?, ?)");
      for (const item of snapshot.quotes || []) insertQuote.run(item.id, item.date, item.name, item.phone, item.message, item.status);

      const insertCount = database.prepare("INSERT INTO physical_counts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      for (const item of snapshot.physicalCounts || []) insertCount.run(item.id, item.productId, item.locationId, item.expected, item.counted, item.reason, item.createdAt, item.createdBy, item.status, nil(item.reviewedAt), nil(item.reviewedBy));

      const insertAudit = database.prepare(`INSERT INTO audit_log
        (id, date, user_id, user_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of snapshot.audit || []) insertAudit.run(item.id, item.date, nil(item.userId), item.userName, item.action, item.entity, item.entityId, item.detail || "");

      database.exec("COMMIT");
      return snapshot;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}
