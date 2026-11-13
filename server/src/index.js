import { inaccRoutes } from "./inacc.js";
import {catalogReferences} from "./catalog.js";
import {commercialRoutes} from "./commercial.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabaseBackup, readStore, storageHealth, totalStock, writeStore } from "./store.js";
import { getDatabase } from "./db/database.js";
import { automaticBackupStatus, createAutomaticBackup, startAutomaticBackups } from "./automatic-backup.js";

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(sourceRoot, "../../.env") });

const app = express();
const port = process.env.PORT || 4000;
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error("Configura JWT_SECRET con al menos 32 caracteres antes de iniciar en producción.");
}
const jwtSecret = process.env.JWT_SECRET || randomBytes(48).toString("base64url");
const roles = ["JEFE","GERENTE", "ADMINISTRACION", "VENTAS", "ALMACEN"];
const permissions = {
  JEFE:["*"],
  GERENTE: ["*"],
  ADMINISTRACION: ["read", "clients", "sales", "payments", "billing", "movements", "suppliers", "purchases", "cash", "transfers", "audit", "backup"],
  VENTAS: ["read", "clients", "sales", "payments", "billing"],
  ALMACEN: ["read", "movements", "suppliers", "purchases", "transfers"]
};

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors({
  origin(origin, callback) {
    const configured = process.env.CLIENT_ORIGIN?.split(",").map((item) => item.trim()).filter(Boolean) || [];
    const localNetwork = !origin || /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin);
    callback(localNetwork || configured.includes(origin) ? null : new Error("Origen no autorizado"), true);
  }
}));
app.use(express.json({ limit: "1mb" }));

const ok = (res, data, code = 200) => res.status(code).json({ status: "success", data });
const fail = (res, code, message, details) => res.status(code).json({ status: "fail", message, details });
const safeUser = ({ passwordHash, demoPassword, ...user }) => user;
const hasPermission = (role, permission) => permissions[role]?.includes("*") || permissions[role]?.includes(permission);
const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const timestamp = () => new Date().toISOString();
const executive=role=>["JEFE","GERENTE"].includes(role);
const visibleProduct=(p,role)=>executive(role)?p:Object.fromEntries(Object.entries(p).filter(([key])=>key!=="costPrice"));
const visiblePurchase=(p,role)=>executive(role)?p:{...p,total:null,subtotal:null,tax:null,items:p.items.map(({unitCost,...line})=>line)};
const reserved=(db,id,location)=>db.invoices.filter(i=>i.deliveryStatus==="RESERVADO"&&i.locationId===location).reduce((sum,i)=>sum+i.items.filter(l=>l.productId===id).reduce((n,l)=>n+l.quantity,0),0);
const available=(db,p,location)=>(p.stock[location]||0)-reserved(db,p.id,location);
function deliver(db,invoice,req){
 for(const line of invoice.items){const p=db.products.find(p=>p.id===line.productId);if(!p||p.stock[invoice.locationId]<line.quantity)throw new Error("Stock reservado insuficiente");p.stock[invoice.locationId]-=line.quantity;addInventoryMovement(db,req,{type:"SALIDA",productId:p.id,quantity:line.quantity,from:invoice.locationId,to:null,reason:"Entrega completa pagada",document:invoice.number});}
 invoice.deliveryStatus="ENTREGADO";
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return fail(res, 401, "Tu sesión no está disponible. Inicia sesión nuevamente.");
  try {
    const claims = jwt.verify(token, jwtSecret, { algorithms: ["HS256"], issuer: "ingenacc-erp" });
    if (getDatabase().prepare("SELECT 1 FROM revoked_tokens WHERE id = ?").get(claims.jti || token)) return fail(res, 401, "Esta sesión fue cerrada.");
    const current = readStore().users.find((user) => user.id === claims.id && user.active);
    if (!current) return fail(res, 401, "Usuario inactivo o inexistente.");
    req.user = { id: current.id, name: current.name, role: current.role, locationId: current.locationId };
    req.session = { id: claims.jti || token, expires: claims.exp };
    return next();
  } catch {
    return fail(res, 401, "La sesión venció o no es válida.");
  }
}

const allow = (permission) => (req, res, next) => hasPermission(req.user.role, permission)
  ? next()
  : fail(res, 403, "Tu rol no tiene permiso para realizar esta acción.");

function audit(db, req, action, entity, entityId, detail = "") {
  db.audit.unshift({
    id: randomUUID(),
    date: timestamp(),
    userId: req.user?.id || null,
    userName: req.user?.name || "Sistema",
    action,
    entity,
    entityId,
    detail
  });
  db.audit = db.audit.slice(0, 1000);
}

function nextNumber(db, type, width = 6) {
  const serial = db.series[type];
  const value = `${serial.prefix}-${String(serial.next).padStart(width, "0")}`;
  serial.next += 1;
  return value;
}

function findOpenCash(db, locationId, requestedId) {
  if (requestedId) return db.cashSessions.find((session) => session.id === requestedId && session.locationId === locationId && session.status === "ABIERTA");
  return db.cashSessions.find((session) => session.locationId === locationId && session.status === "ABIERTA");
}

function addCashMovement(db, session, values, req) {
  const movement = {
    id: randomUUID(),
    cashSessionId: session.id,
    date: timestamp(),
    responsible: req.user.name,
    ...values
  };
  db.cashMovements.unshift(movement);
  return movement;
}

function addInventoryMovement(db, req, values) {
  const product = db.products.find((item) => item.id === values.productId);
  const movement = {
    id: randomUUID(),
    date: timestamp(),
    responsible: req.user.name,
    balanceAfter: totalStock(product),
    ...values
  };
  db.movements.unshift(movement);
  return movement;
}

function calculateCashExpected(db, sessionId) {
  const session = db.cashSessions.find((item) => item.id === sessionId);
  if (!session) return 0;
  return money(session.openingAmount + db.cashMovements
    .filter((item) => item.cashSessionId === sessionId && item.method === "EFECTIVO")
    .reduce((sum, item) => sum + (item.type === "INGRESO" ? item.amount : -item.amount), 0));
}

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8) });
const clientSchema = z.object({ documentType: z.enum(["DNI", "RUC", "CE"]), documentNumber: z.string().min(8).max(15), name: z.string().min(3).max(120), phone: z.string().min(6).max(30), email: z.string().email().or(z.literal("")), address: z.string().max(180).default("") });
const supplierSchema = z.object({ documentType: z.enum(["RUC", "DNI", "OTRO"]), documentNumber: z.string().min(6).max(20), name: z.string().min(3).max(140), contact: z.string().max(100).default(""), phone: z.string().max(30).default(""), email: z.string().email().or(z.literal("")), address: z.string().max(180).default("") });
const productSchema = z.object({ code: z.string().max(30).default(""), barcode: z.string().max(40).default(""), manufacturerCode: z.string().max(40).default("Por validar"), name: z.string().min(3).max(120), description: z.string().max(240).default(""), brand: z.string().min(2), model: z.string().min(1), sector: z.enum(["Construcción", "Agricultura", "Minería", "Multipropósito", "Repuestos"]), category: z.string().min(2), subcategory: z.string().max(80).default("Por validar"), unit: z.string().min(2).max(8), costPrice: z.coerce.number().nonnegative(), price: z.coerce.number().positive(), minStock: z.coerce.number().int().nonnegative(), initialStock: z.coerce.number().int().nonnegative(), locationId: z.string().min(1), power: z.string().default("Por validar"), fuel: z.string().default("Por validar"), origin: z.string().default("Por validar"), warranty: z.string().default("Por validar") });
const productImportSchema = z.object({ rows:z.array(z.unknown()).min(1).max(2000), commit:z.boolean().default(false) }).strict();
const movementSchema = z.object({ type: z.enum(["ENTRADA", "SALIDA", "TRASLADO", "AJUSTE"]), direction: z.enum(["ENTRADA", "SALIDA"]).optional(), productId: z.string(), quantity: z.coerce.number().int().positive(), from: z.string().nullable().optional(), to: z.string().nullable().optional(), reason: z.string().min(3), document: z.string().min(2) });
const purchaseSchema = z.object({ supplierId: z.string(), locationId: z.string(), items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().int().positive(), unitCost: z.coerce.number().positive() })).min(1), reference: z.string().max(100).default(""), notes: z.string().max(240).default("") });
const transferSchema = z.object({ productId: z.string(), quantity: z.coerce.number().int().positive(), from: z.string(), to: z.string(), reason: z.string().min(3).max(160) });
const saleSchema = z.object({ documentType: z.enum(["FACTURA", "BOLETA", "NOTA_VENTA"]), clientId: z.string(), locationId: z.string(), cashSessionId: z.string().optional(), items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })).min(1), initialPayment: z.coerce.number().nonnegative().default(0), paymentMethod: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "YAPE_PLIN"]), discountAmount:z.coerce.number().nonnegative().default(0), reference: z.string().max(100).default("") });
const paymentSchema = z.object({ invoiceId: z.string(), cashSessionId: z.string().optional(), amount: z.coerce.number().positive(), method: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "YAPE_PLIN"]), reference: z.string().min(2).max(100) });
const returnSchema = z.object({ invoiceId: z.string(), productId: z.string(), quantity: z.coerce.number().int().positive(), reason: z.string().min(5).max(180), returnToStock: z.boolean().default(true) });
const cashOpenSchema = z.object({ locationId: z.string(), openingAmount: z.coerce.number().nonnegative() });
const cashMovementSchema = z.object({ cashSessionId: z.string(), type: z.enum(["INGRESO", "EGRESO"]), amount: z.coerce.number().positive(), method: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "YAPE_PLIN"]), concept: z.string().min(3).max(120), reference: z.string().max(100).default("") });
const cashCloseSchema = z.object({ cashSessionId: z.string(), countedAmount: z.coerce.number().nonnegative() });
const userSchema = z.object({ name: z.string().min(3), email: z.string().email(), role: z.enum(roles), locationId: z.string(), password: z.string().min(10).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/) });
const quoteSchema = z.object({ name: z.string().min(3).max(120), phone: z.string().min(6).max(30), message: z.string().min(5).max(500) });
const setupSchema = z.object({
  legalName:z.string().trim().min(3).max(150), tradeName:z.string().trim().min(2).max(80),
  ruc:z.string().regex(/^\d{11}$/), address:z.string().trim().min(5).max(180),
  adminName:z.string().trim().min(3).max(120), adminEmail:z.string().trim().toLowerCase().email(),
  password:z.string().min(12).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  locationId:z.string().min(1), setupToken:z.string().max(200).optional().default("")
}).strict();

app.get("/api/health", (_req, res) => {
  const storage = storageHealth();
  return ok(res, { service:"ingenacc-api", online:true, version:"4.0.0", persistence:"sqlite", database:{ integrity:storage.integrity, journalMode:storage.journalMode, migrationsApplied:storage.migrationsApplied } });
});
app.get("/api/public/bootstrap", (_req, res) => {
  const db = readStore();
  const products = db.products.filter((item) => item.active).map(({ id, name, description, brand, model, sector, category, price, power, fuel, warranty }) => ({ id, name, description, brand, model, sector, category, price, power, fuel, warranty }));
  ok(res, { demoMode:db.demoMode, company: db.company, brands: db.brands, locations: db.locations.filter((item) => item.active && item.kind === "TIENDA"), products });
});
app.get("/api/setup/status", (_req, res) => {
  const db=readStore();
  return ok(res,{required:db.users.length===0,tokenRequired:Boolean(process.env.SETUP_TOKEN),locations:db.locations.filter(item=>item.active).map(({id,name})=>({id,name})),company:{legalName:db.company.legalName,tradeName:db.company.tradeName,ruc:db.company.ruc,address:db.company.address}});
});
app.post("/api/setup/initialize", rateLimit({windowMs:15*60*1000,limit:5}), async(req,res)=>{
  const db=readStore();
  if(db.users.length) return fail(res,409,"El sistema ya fue configurado.");
  const parsed=setupSchema.safeParse(req.body);
  if(!parsed.success)return fail(res,400,"Revisa los datos. La contraseña debe tener 12 caracteres, mayúscula, minúscula, número y símbolo.",parsed.error.flatten());
  if(process.env.SETUP_TOKEN && parsed.data.setupToken!==process.env.SETUP_TOKEN)return fail(res,403,"El código de instalación no es válido.");
  if(!db.locations.some(item=>item.id===parsed.data.locationId&&item.active))return fail(res,400,"Selecciona una sede válida.");
  const {legalName,tradeName,ruc,address,adminName,adminEmail,password,locationId}=parsed.data;
  db.demoMode=false;db.company={...db.company,legalName,tradeName,ruc,address};
  const user={id:randomUUID(),name:adminName,email:adminEmail,role:"GERENTE",locationId,active:true,passwordHash:await bcrypt.hash(password,12)};
  db.users.push(user);audit(db,{user},"INITIALIZE","SYSTEM",user.id,"Configuración inicial operativa");writeStore(db);
  return ok(res,{initialized:true,email:adminEmail},201);
});
app.post("/api/quotes", rateLimit({ windowMs: 15 * 60 * 1000, limit: 12 }), (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Completa correctamente los datos de contacto.");
  const db = readStore();
  const quote = { id: randomUUID(), date: timestamp(), ...parsed.data, status: "NUEVA" };
  db.quotes.unshift(quote);
  writeStore(db);
  return ok(res, quote, 201);
});

app.post("/api/auth/login", rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => fail(res, 429, "Demasiados intentos fallidos. Espera cinco minutos o reinicia la aplicación local.")
}), async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Correo o contraseña inválidos.");
  const candidate = readStore().users.find((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase());
  if (!candidate?.active || !(await bcrypt.compare(parsed.data.password, candidate.passwordHash))) return fail(res, 401, "Credenciales incorrectas.");
  const db = readStore();
  const user = db.users.find((item) => item.id === candidate.id && item.active);
  if (!user) return fail(res, 401, "El usuario ya no está activo.");
  const location = db.locations.find((item) => item.id === user.locationId);
  const sessionUser = { ...safeUser(user), locationName: location?.name || "Sin sede" };
  const token = jwt.sign({ id: user.id, name: user.name, role: user.role, locationId: user.locationId }, jwtSecret, { expiresIn: "8h", issuer: "ingenacc-erp", jwtid: randomUUID() });
  audit(db, { user }, "LOGIN", "SESSION", user.id, "Inicio de sesión");
  writeStore(db);
  return ok(res, { token, user: sessionUser, expiresIn: 28800 });
});
app.get("/api/auth/me", authenticate, (req, res) => {
  const db = readStore();
  const user = db.users.find((item) => item.id === req.user.id);
  if (!user?.active) return fail(res, 401, "Usuario inactivo.");
  return ok(res, safeUser(user));
});

inaccRoutes(app, { authenticate, readStore, ok, fail });

app.use("/api", authenticate);
app.post("/api/auth/logout", (req, res) => {
  const database = getDatabase();
  database.prepare("DELETE FROM revoked_tokens WHERE expires < ?").run(Math.floor(Date.now() / 1000));
  database.prepare("INSERT OR IGNORE INTO revoked_tokens (id, expires) VALUES (?, ?)").run(req.session.id, req.session.expires);
  return ok(res, { loggedOut:true });
});
app.get("/api/bootstrap", allow("read"), (req, res) => {
  const db = readStore();
  const canAudit = executive(req.user.role);
  const commercial = canAudit || ["VENTAS","ADMINISTRACION"].includes(req.user.role);
  const warehouse = canAudit || ["ALMACEN","ADMINISTRACION"].includes(req.user.role);
  ok(res, {
    demoMode:db.demoMode, schemaVersion: db.schemaVersion, company: db.company, brands: db.brands,
    locations:db.locations,products:db.products.map(p=>({...visibleProduct(p,req.user.role),availableStock:Object.fromEntries(db.locations.map(l=>[l.id,available(db,p,l.id)]))})),
    catalogReferences,
    proformas:commercial?db.proformas:[],customerOrders:commercial?db.customerOrders:[],
    equipment:commercial?db.equipment:[],serviceCases:commercial?db.serviceCases:[],
    movements: warehouse ? db.movements : [], transfers: warehouse ? db.transfers : [],
    suppliers: warehouse ? db.suppliers : [], purchases: warehouse ? db.purchases.map(p=>visiblePurchase(p,req.user.role)) : [],
    purchaseReceipts: warehouse ? db.purchaseReceipts : [],
    physicalCounts: warehouse ? db.physicalCounts : [],
    clients: commercial ? db.clients : [], invoices: commercial ? db.invoices : [],
    payments: commercial ? db.payments : [], returns: executive(req.user.role) ? db.returns : [],
    cashSessions: canAudit ? db.cashSessions : ["VENTAS","ADMINISTRACION"].includes(req.user.role)
      ? db.cashSessions.filter((item) => item.status === "ABIERTA").map(({ id, locationId, status }) => ({ id, locationId, status })) : [],
    cashMovements: canAudit ? db.cashMovements : [],
    users: executive(req.user.role) ? db.users.map(safeUser) : db.users.filter((item) => item.id === req.user.id).map(safeUser),
    audit: canAudit ? db.audit : [], quotes: canAudit ? db.quotes : [],
    storage: canAudit ? storageHealth() : null
  });
});
app.get("/api/products/barcode/:barcode", allow("read"), (req, res) => {
  const product = readStore().products.find((item) => item.active && item.barcode === req.params.barcode);
  return product ? ok(res,visibleProduct(product,req.user.role)) : fail(res, 404, "El código leído no corresponde a un producto registrado.");
});

app.post("/api/products", allow("products"), (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa los datos del producto.", parsed.error.flatten());
  const db = readStore();
  const data = parsed.data;
  if(!data.code)data.code=`SKU-${String(db.products.length+1).padStart(5,"0")}`;
  if(!data.barcode)data.barcode=`200${String(Date.now()).slice(-10)}`;
  if (db.products.some((item) => item.code.toLowerCase() === data.code.toLowerCase() || item.barcode === data.barcode)) return fail(res, 409, "El código interno o código de barras ya existe.");
  if (!db.locations.some((item) => item.id === data.locationId && item.active)) return fail(res, 400, "La ubicación no existe o está inactiva.");
  const stock = Object.fromEntries(db.locations.map((item) => [item.id, item.id === data.locationId ? data.initialStock : 0]));
  const { initialStock, locationId, ...fields } = data;
  const product = { id: randomUUID(), ...fields, stock, active: true };
  db.products.unshift(product);
  if (initialStock > 0) addInventoryMovement(db, req, { type: "ENTRADA", productId: product.id, quantity: initialStock, from: null, to: locationId, reason: "Stock inicial", document: "INICIAL" });
  audit(db, req, "CREATE", "PRODUCT", product.id, product.code);
  writeStore(db);
  return ok(res, product, 201);
});

app.post("/api/products/import", allow("products"), (req, res) => {
  const request = productImportSchema.safeParse(req.body);
  if (!request.success) return fail(res, 400, "El archivo debe contener entre 1 y 2000 productos.");
  const db = readStore();
  const locations = new Set(db.locations.filter((item) => item.active).map((item) => item.id));
  const codes = new Set(db.products.map((item) => item.code.toLowerCase()));
  const barcodes = new Set(db.products.map((item) => item.barcode));
  const errors = [];
  const products = [];
  let sequence = db.products.length + 1;
  const nextCode = () => { let code; do code = `SKU-${String(sequence++).padStart(5, "0")}`; while (codes.has(code.toLowerCase())); return code; };
  request.data.rows.forEach((row, index) => {
    const parsed = productSchema.safeParse(row);
    if (!parsed.success) {
      const fields = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
      errors.push({ row:index + 2, message:`Revisa: ${fields || "datos del producto"}` });
      return;
    }
    const data = parsed.data;
    if (!locations.has(data.locationId)) { errors.push({ row:index + 2, message:"La ubicación no existe o está inactiva." }); return; }
    if (!data.code) data.code = nextCode();
    if (!data.barcode) data.barcode = `200${String(Date.now()).slice(-9)}${String(index).padStart(3, "0")}`;
    const normalizedCode = data.code.toLowerCase();
    if (codes.has(normalizedCode)) { errors.push({ row:index + 2, message:`Código duplicado: ${data.code}` }); return; }
    if (barcodes.has(data.barcode)) { errors.push({ row:index + 2, message:`Código de barras duplicado: ${data.barcode}` }); return; }
    codes.add(normalizedCode); barcodes.add(data.barcode); products.push(data);
  });
  const summary = { total:request.data.rows.length, valid:products.length, invalid:errors.length, errors:errors.slice(0, 100), canImport:errors.length === 0 };
  if (!request.data.commit) return ok(res, summary);
  if (errors.length) return fail(res, 400, `Corrige ${errors.length} fila(s) antes de importar.`, summary);
  for (const data of products) {
    const stock = Object.fromEntries(db.locations.map((item) => [item.id, item.id === data.locationId ? data.initialStock : 0]));
    const { initialStock, locationId, ...fields } = data;
    const product = { id:randomUUID(), ...fields, stock, active:true };
    db.products.unshift(product);
    if (initialStock > 0) addInventoryMovement(db, req, { type:"ENTRADA", productId:product.id, quantity:initialStock, from:null, to:locationId, reason:"Importación de inventario inicial", document:"IMPORTACION" });
  }
  audit(db, req, "IMPORT", "PRODUCT", "bulk", `${products.length} productos importados desde Excel`);
  writeStore(db);
  return ok(res, { ...summary, imported:products.length }, 201);
});

app.post("/api/clients", allow("clients"), (req, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa los datos del cliente.", parsed.error.flatten());
  const db = readStore();
  if (db.clients.some((item) => item.documentNumber === parsed.data.documentNumber)) return fail(res, 409, "Ya existe un cliente con ese documento.");
  const client = { id: randomUUID(), ...parsed.data, active: true };
  db.clients.unshift(client);
  audit(db, req, "CREATE", "CLIENT", client.id, client.documentNumber);
  writeStore(db);
  return ok(res, client, 201);
});

app.post("/api/suppliers", allow("suppliers"), (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa los datos del proveedor.", parsed.error.flatten());
  const db = readStore();
  if (db.suppliers.some((item) => item.documentNumber === parsed.data.documentNumber)) return fail(res, 409, "Ya existe un proveedor con ese documento.");
  const supplier = { id: randomUUID(), ...parsed.data, active: true };
  db.suppliers.unshift(supplier);
  audit(db, req, "CREATE", "SUPPLIER", supplier.id, supplier.name);
  writeStore(db);
  return ok(res, supplier, 201);
});

app.post("/api/movements", allow("movements"), (req, res) => {
  const parsed = movementSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Datos de movimiento inválidos.", parsed.error.flatten());
  if (parsed.data.type === "AJUSTE") return fail(res, 403, "Registra un conteo físico y solicita su aprobación para ajustar stock.");
  const db = readStore();
  const data = parsed.data;
  const product = db.products.find((item) => item.id === data.productId && item.active);
  if (!product) return fail(res, 404, "Producto no encontrado.");
  const validLocation = (id) => db.locations.some((item) => item.id === id && item.active);
  const isOutput = data.type === "SALIDA" || (data.type === "AJUSTE" && data.direction === "SALIDA");
  const isInput = data.type === "ENTRADA" || (data.type === "AJUSTE" && data.direction !== "SALIDA");
  if (data.type === "TRASLADO") {
    if (!data.from || !data.to || data.from === data.to) return fail(res, 400, "Selecciona ubicaciones de origen y destino diferentes.");
    if (!validLocation(data.from) || !validLocation(data.to)) return fail(res, 400, "El origen o destino no corresponde a una ubicación activa.");
    if (available(db,product,data.from) < data.quantity) return fail(res, 409, "Stock insuficiente en la ubicación de origen.");
    product.stock[data.from] -= data.quantity;
    product.stock[data.to] = (product.stock[data.to] || 0) + data.quantity;
    const number = data.document.startsWith("TR-") ? data.document : nextNumber(db, "TRASLADO");
    const transfer = { id: randomUUID(), number, date: timestamp(), productId: data.productId, quantity: data.quantity, from: data.from, to: data.to, reason: data.reason, responsible: req.user.name, status: "RECIBIDO" };
    db.transfers.unshift(transfer);
    const movement = addInventoryMovement(db, req, { ...data, document: number, direction: undefined, from: data.from, to: data.to });
    audit(db, req, "CREATE", "TRANSFER", transfer.id, number);
    writeStore(db);
    return ok(res, movement, 201);
  }
  const locationId = isOutput ? data.from : data.to;
  if (!locationId) return fail(res, 400, `Selecciona la ubicación de ${isOutput ? "origen" : "destino"}.`);
  if (!validLocation(locationId)) return fail(res, 400, "La ubicación seleccionada no existe o está inactiva.");
  if (isOutput && available(db,product,locationId) < data.quantity) return fail(res, 409, "Stock insuficiente en la ubicación seleccionada.");
  product.stock[locationId] = (product.stock[locationId] || 0) + (isOutput ? -data.quantity : data.quantity);
  const movement = addInventoryMovement(db, req, { ...data, direction: undefined, from: isOutput ? locationId : null, to: isInput ? locationId : null });
  audit(db, req, "CREATE", "MOVEMENT", movement.id, `${data.type} ${data.quantity}`);
  writeStore(db);
  return ok(res, movement, 201);
});

app.post("/api/transfers", allow("transfers"), (req, res) => {
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa los datos del traslado.", parsed.error.flatten());
  const db = readStore();
  const data = parsed.data;
  if (data.from === data.to) return fail(res, 400, "El origen y el destino deben ser diferentes.");
  if (!db.locations.some((item) => item.id === data.from && item.active) || !db.locations.some((item) => item.id === data.to && item.active)) return fail(res, 400, "El origen o destino no corresponde a una ubicación activa.");
  const product = db.products.find((item) => item.id === data.productId && item.active);
  if (!product) return fail(res, 404, "Producto no encontrado.");
  if (available(db,product,data.from) < data.quantity) return fail(res, 409, "Stock insuficiente en la ubicación de origen.");
  product.stock[data.from] -= data.quantity;
  product.stock[data.to] = (product.stock[data.to] || 0) + data.quantity;
  const number = nextNumber(db, "TRASLADO");
  const transfer = { id: randomUUID(), number, date: timestamp(), ...data, responsible: req.user.name, status: "RECIBIDO" };
  db.transfers.unshift(transfer);
  addInventoryMovement(db, req, { type: "TRASLADO", productId: data.productId, quantity: data.quantity, from: data.from, to: data.to, reason: data.reason, document: number });
  audit(db, req, "CREATE", "TRANSFER", transfer.id, number);
  writeStore(db);
  return ok(res, transfer, 201);
});

app.post("/api/physical-counts", allow("movements"), (req, res) => {
  const parsed = z.object({ productId:z.string(), locationId:z.string(), counted:z.coerce.number().int().nonnegative(), reason:z.string().trim().min(5).max(300) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Indica producto, ubicación, cantidad contada y motivo (mínimo 5 caracteres).");
  const db = readStore(); const data = parsed.data;
  const product = db.products.find((item) => item.id === data.productId && item.active);
  if (!product || !db.locations.some((item) => item.id === data.locationId && item.active)) return fail(res, 400, "Producto o ubicación inválidos.");
  if (db.physicalCounts.some((item) => item.productId === data.productId && item.locationId === data.locationId && item.status === "PENDIENTE")) return fail(res, 409, "Ya existe un conteo pendiente para este producto y ubicación.");
  const count = {id:randomUUID(), ...data, expected:product.stock[data.locationId] || 0, createdAt:timestamp(), createdBy:req.user.id, status:"PENDIENTE", reviewedAt:null, reviewedBy:null};
  db.physicalCounts.unshift(count); audit(db, req, "COUNT", "PHYSICAL_COUNT", count.id, `${count.expected} registrado / ${count.counted} contado`); writeStore(db);
  return ok(res, count, 201);
});

app.post("/api/physical-counts/:id/review", (req, res) => {
  if (!executive(req.user.role)) return fail(res, 403, "Solo jefe o gerente puede autorizar conteos.");
  const parsed = z.object({approve:z.boolean()}).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Selecciona aprobar o rechazar.");
  const db = readStore(); const count = db.physicalCounts.find((item) => item.id === req.params.id);
  if (!count) return fail(res, 404, "Conteo no encontrado.");
  if (count.status !== "PENDIENTE") return fail(res, 409, "El conteo ya fue revisado.");
  if (count.createdBy === req.user.id && parsed.data.approve) return fail(res, 403, "Otra persona autorizada debe aprobar tu conteo.");
  if (parsed.data.approve) {
    const product = db.products.find((item) => item.id === count.productId);
    if (!product?.active || !db.locations.some((item) => item.id === count.locationId && item.active)) return fail(res, 409, "Producto o ubicación inactivos.");
    if (product.stock[count.locationId] !== count.expected) return fail(res, 409, "El stock cambió desde el conteo. Rechaza este conteo y registra uno nuevo.");
    if(count.counted < reserved(db,count.productId,count.locationId))return fail(res,409,"El conteo dejaría reservas sin stock.");
    const difference = count.counted - count.expected;
    product.stock[count.locationId] = count.counted;
    if (difference) addInventoryMovement(db, req, {type:"AJUSTE", productId:count.productId, quantity:Math.abs(difference), from:difference < 0 ? count.locationId : null, to:difference > 0 ? count.locationId : null, reason:count.reason, document:`CF-${count.id}`});
  }
  count.status = parsed.data.approve ? "APROBADO" : "RECHAZADO"; count.reviewedAt = timestamp(); count.reviewedBy = req.user.id;
  audit(db, req, count.status, "PHYSICAL_COUNT", count.id, count.reason); writeStore(db); return ok(res, count);
});

app.post("/api/purchases", allow("products"), (req, res) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa los datos de la compra.", parsed.error.flatten());
  const db = readStore();
  const data = parsed.data;
  if (!db.suppliers.some((item) => item.id === data.supplierId && item.active)) return fail(res, 400, "Selecciona un proveedor activo.");
  if (!db.locations.some((item) => item.id === data.locationId && item.active)) return fail(res, 400, "Selecciona una ubicación activa.");
  for (const item of data.items) if (!db.products.some((product) => product.id === item.productId && product.active)) return fail(res, 400, "La compra contiene un producto inválido.");
  const total = money(data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0));
  const subtotal = money(total / (1 + db.company.taxRate));
  const purchase = { id: randomUUID(), number: nextNumber(db, "COMPRA"), date: timestamp(), ...data, subtotal, tax: money(total - subtotal), total, status: "PENDIENTE", createdBy: req.user.name, receivedAt: null, receivedBy: null };
  db.purchases.unshift(purchase);
  audit(db, req, "CREATE", "PURCHASE", purchase.id, purchase.number);
  writeStore(db);
  return ok(res, purchase, 201);
});

app.post("/api/purchases/:id/receive", allow("purchases"), (req, res) => {
  const parsed = z.object({
    requestId: z.string().uuid(),
    items: z.array(z.object({ line: z.number().int().nonnegative(), quantity: z.number().int().positive() })).min(1)
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Indica las cantidades recibidas y un identificador de recepción válido.");
  const db = readStore();
  const purchase = db.purchases.find((item) => item.id === req.params.id);
  if (!purchase) return fail(res, 404, "Compra no encontrada.");
  const previous = db.purchaseReceipts.find((item) => item.id === parsed.data.requestId);
  if (previous) return previous.purchaseId === purchase.id && JSON.stringify(previous.items) === JSON.stringify(parsed.data.items)
    ? ok(res,visiblePurchase(purchase,req.user.role)) : fail(res, 409, "El identificador ya pertenece a otra recepción.");
  if (purchase.status === "RECIBIDA") return fail(res, 409, "Esta compra ya fue recibida.");
  if (!db.locations.some((item) => item.id === purchase.locationId && item.active)) return fail(res, 409, "La ubicación de recepción está inactiva.");
  const lines = new Set();
  for (const received of parsed.data.items) {
    const item = purchase.items[received.line];
    if (!item || lines.has(received.line) || received.quantity > item.quantity - (item.receivedQuantity || 0)) return fail(res, 409, "La recepción contiene líneas repetidas o supera la cantidad pendiente.");
    if (!db.products.some((product) => product.id === item.productId && product.active)) return fail(res, 409, "Un producto está inactivo.");
    lines.add(received.line);
  }
  for (const received of parsed.data.items) {
    const item = purchase.items[received.line];
    const product = db.products.find((candidate) => candidate.id === item.productId);
    product.stock[purchase.locationId] = (product.stock[purchase.locationId] || 0) + received.quantity;
    item.receivedQuantity = (item.receivedQuantity || 0) + received.quantity;
    product.costPrice = item.unitCost;
    addInventoryMovement(db, req, { type: "ENTRADA", productId: item.productId, quantity: received.quantity, from: null, to: purchase.locationId, reason: "Recepción de compra", document: purchase.number });
  }
  purchase.status = purchase.items.every((item) => item.receivedQuantity === item.quantity) ? "RECIBIDA" : "PENDIENTE";
  purchase.receivedAt = timestamp();
  purchase.receivedBy = req.user.name;
  db.purchaseReceipts.unshift({ id: parsed.data.requestId, purchaseId: purchase.id, date: purchase.receivedAt, responsible: req.user.name, items: parsed.data.items });
  audit(db, req, "RECEIVE", "PURCHASE", purchase.id, purchase.number);
  writeStore(db);
  return ok(res,visiblePurchase(purchase,req.user.role));
});

commercialRoutes(app,{allow,readStore,writeStore,ok,fail,executive,audit,available,findOpenCash,addCashMovement,nextNumber,deliver});

app.post("/api/sales", allow("sales"), (req, res) => {
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa los datos de la venta.", parsed.error.flatten());
  const db = readStore();
  const data = parsed.data;
  const client = db.clients.find((item) => item.id === data.clientId && item.active);
  const location = db.locations.find((item) => item.id === data.locationId && item.active);
  if (!client || !location) return fail(res, 400, "Cliente o ubicación inválidos.");
  if (data.documentType === "FACTURA" && client.documentType !== "RUC") return fail(res, 400, "Una factura requiere un cliente con RUC.");
  const requested = [...data.items.reduce((map, item) => map.set(item.productId, (map.get(item.productId) || 0) + item.quantity), new Map()).entries()]
    .map(([productId, quantity]) => ({ productId, quantity }));
  const items = [];
  for (const input of requested) {
    const product = db.products.find((item) => item.id === input.productId && item.active);
    if (!product) return fail(res, 404, "Uno de los productos no existe o está inactivo.");
    if (available(db,product,data.locationId) < input.quantity) return fail(res, 409, `Stock insuficiente para ${product.name} en ${location.name}.`);
    items.push({ productId: product.id, quantity: input.quantity, unitPrice: product.price });
  }
  if(data.discountAmount > 0 && !executive(req.user.role))return fail(res,403,"Solo jefe o gerente puede autorizar descuentos.");
  const gross=money(items.reduce((sum,item)=>sum+item.quantity*item.unitPrice,0));
  if(data.discountAmount>=gross)return fail(res,400,"Descuento debe ser menor al importe.");
  const total=money(gross-data.discountAmount);
  if(data.initialPayment<=0)return fail(res,400,"Sin crédito: registra un adelanto o el pago completo.");
  if (data.initialPayment > total) return fail(res, 400, "El pago inicial no puede superar el total.");
  if (data.paymentMethod === "CREDITO" && data.initialPayment > 0) return fail(res, 400, "Una venta a crédito debe iniciar sin pago; registra luego el abono con su medio real.");
  const cashSession = data.initialPayment > 0 ? findOpenCash(db, data.locationId, data.cashSessionId) : null;
  if (data.initialPayment > 0 && !cashSession) return fail(res, 409, "Abre una caja en el punto de venta antes de registrar pagos.");
  const subtotal = money(total / (1 + db.company.taxRate));
  const number = nextNumber(db, data.documentType);
  const invoice = {
    id: randomUUID(), number, documentType: data.documentType, date: timestamp(), clientId: data.clientId,
    locationId: data.locationId, cashSessionId: cashSession?.id || null, items, subtotal, tax: money(total - subtotal), total,
    paid: data.initialPayment, balance: money(total - data.initialPayment),
    paymentStatus: data.initialPayment === total ? "PAGADO" : data.initialPayment > 0 ? "PARCIAL" : "PENDIENTE",
    billingStatus:"INTERNO",seller:req.user.name,discountAmount:data.discountAmount,deliveryStatus:"RESERVADO"
  };
  if(invoice.balance===0)deliver(db,invoice,req);
  db.invoices.unshift(invoice);
  if (data.initialPayment > 0) {
    const payment = { id: randomUUID(), invoiceId: invoice.id, cashSessionId: cashSession.id, date: timestamp(), amount: data.initialPayment, method: data.paymentMethod, reference: data.reference || number, receivedBy: req.user.name };
    db.payments.unshift(payment);
    addCashMovement(db, cashSession, { type: "INGRESO", amount: data.initialPayment, method: data.paymentMethod, concept: `Venta ${number}`, reference: data.reference || number, sourceType: "VENTA", sourceId: invoice.id }, req);
  }
  audit(db, req, "CREATE", "SALE", invoice.id, number);
  writeStore(db);
  return ok(res, invoice, 201);
});

app.post("/api/payments", allow("payments"), (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa los datos del pago.", parsed.error.flatten());
  const db = readStore();
  const data = parsed.data;
  const invoice = db.invoices.find((item) => item.id === data.invoiceId);
  if (!invoice) return fail(res, 404, "Comprobante no encontrado.");
  if (data.amount > invoice.balance) return fail(res, 400, "El pago supera el saldo pendiente.");
  const cashSession = findOpenCash(db, invoice.locationId, data.cashSessionId);
  if (!cashSession) return fail(res, 409, "Abre una caja en la sede del comprobante antes de registrar el pago.");
  const payment = { id: randomUUID(), date: timestamp(), ...data, cashSessionId: cashSession.id, receivedBy: req.user.name };
  db.payments.unshift(payment);
  invoice.paid = money(invoice.paid + data.amount);
  invoice.balance = money(invoice.total - invoice.paid);
  invoice.paymentStatus = invoice.balance === 0 ? "PAGADO" : "PARCIAL";
  if(invoice.balance===0 && invoice.deliveryStatus==="RESERVADO")deliver(db,invoice,req);
  addCashMovement(db, cashSession, { type: "INGRESO", amount: data.amount, method: data.method, concept: `Abono ${invoice.number}`, reference: data.reference, sourceType: "PAGO", sourceId: payment.id }, req);
  audit(db, req, "CREATE", "PAYMENT", payment.id, invoice.number);
  writeStore(db);
  return ok(res, payment, 201);
});

app.post("/api/returns",(_req,res)=>fail(res,403,"La empresa gestiona garantías. Devoluciones deshabilitadas."));

app.post("/api/products/:id/pricing",allow("products"),(req,res)=>{
 const parsed=z.object({price:z.coerce.number().positive(),costPrice:z.coerce.number().nonnegative()}).safeParse(req.body);
 if(!parsed.success)return fail(res,400,"Revisa precio y costo.");
 const db=readStore(),p=db.products.find(p=>p.id===req.params.id);if(!p)return fail(res,404,"Producto no encontrado.");
 const before=`precio ${p.price}, costo ${p.costPrice}`;Object.assign(p,parsed.data);audit(db,req,"PRICING","PRODUCT",p.id,`${before} → precio ${p.price}, costo ${p.costPrice}`);writeStore(db);return ok(res,p);
});
app.post("/api/equipment",allow("sales"),(req,res)=>{
 const parsed=z.object({invoiceId:z.string(),productId:z.string(),serial:z.string().trim().min(3).max(100),warrantyDays:z.coerce.number().int().min(0).max(3650)}).safeParse(req.body);
 if(!parsed.success)return fail(res,400,"Indica venta, producto, serie y días de garantía documentados.");
 const db=readStore(),data=parsed.data,invoice=db.invoices.find(i=>i.id===data.invoiceId),line=invoice?.items.find(i=>i.productId===data.productId);
 if(!line||invoice.deliveryStatus==="RESERVADO")return fail(res,409,"Selecciona un equipo de una venta entregada.");
 if(db.equipment.some(e=>e.serial.toLowerCase()===data.serial.toLowerCase()))return fail(res,409,"Serie ya registrada.");
 if(db.equipment.filter(e=>e.invoiceId===invoice.id&&e.productId===data.productId).length>=line.quantity)return fail(res,409,"Todas las unidades de la venta ya tienen serie.");
 const record={id:randomUUID(),...data,clientId:invoice.clientId,registeredAt:timestamp(),registeredBy:req.user.name,warrantyStart:db.movements.find(m=>m.document===invoice.number&&m.type==="SALIDA")?.date||invoice.date};
 db.equipment.unshift(record);audit(db,req,"REGISTER","EQUIPMENT",record.id,record.serial);writeStore(db);return ok(res,record,201);
});
app.post("/api/service-cases",allow("sales"),(req,res)=>{
 const parsed=z.object({equipmentId:z.string(),kind:z.enum(["GARANTIA","REPARACION","MANTENIMIENTO"]),description:z.string().trim().min(5).max(1000)}).safeParse(req.body);
 if(!parsed.success)return fail(res,400,"Indica equipo, atención y descripción.");
 const db=readStore();if(!db.equipment.some(e=>e.id===parsed.data.equipmentId))return fail(res,404,"Equipo no registrado.");
 const record={id:randomUUID(),...parsed.data,status:"RECIBIDO",createdAt:timestamp(),updatedAt:timestamp(),responsible:req.user.name,resolution:""};
 db.serviceCases.unshift(record);audit(db,req,"OPEN","SERVICE",record.id,record.kind);writeStore(db);return ok(res,record,201);
});
app.post("/api/service-cases/:id/status",allow("sales"),(req,res)=>{
 if(!executive(req.user.role))return fail(res,403,"Solo jefe o gerente puede actualizar el estado técnico.");
 const parsed=z.object({status:z.enum(["DIAGNOSTICO","EN_REPARACION","LISTO","ENTREGADO"]),resolution:z.string().trim().min(5).max(1000)}).safeParse(req.body);
 if(!parsed.success)return fail(res,400,"Indica estado y diagnóstico o resolución.");
 const db=readStore(),record=db.serviceCases.find(c=>c.id===req.params.id);if(!record)return fail(res,404,"Atención no encontrada.");
 const next={RECIBIDO:["DIAGNOSTICO"],DIAGNOSTICO:["EN_REPARACION","LISTO"],EN_REPARACION:["LISTO"],LISTO:["ENTREGADO"],ENTREGADO:[]};
 if(!next[record.status].includes(parsed.data.status))return fail(res,409,"Transición no permitida. Sigue las etapas del servicio.");
 Object.assign(record,parsed.data,{updatedAt:timestamp(),responsible:req.user.name});audit(db,req,"UPDATE","SERVICE",record.id,record.status+": "+record.resolution);writeStore(db);return ok(res,record);
});

app.post("/api/cash/open", allow("cash"), (req, res) => {
  const parsed = cashOpenSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa los datos de apertura.", parsed.error.flatten());
  const db = readStore();
  if (!db.locations.some((item) => item.id === parsed.data.locationId && item.kind === "TIENDA" && item.active)) return fail(res, 400, "Selecciona una tienda activa.");
  if (findOpenCash(db, parsed.data.locationId)) return fail(res, 409, "Ya existe una caja abierta en esa tienda.");
  const session = { id: randomUUID(), number: nextNumber(db, "CAJA"), locationId: parsed.data.locationId, userId: req.user.id, openedBy: req.user.name, openedAt: timestamp(), openingAmount: parsed.data.openingAmount, status: "ABIERTA", closedAt: null, countedAmount: null, expectedAmount: null, difference: null };
  db.cashSessions.unshift(session);
  audit(db, req, "OPEN", "CASH", session.id, session.number);
  writeStore(db);
  return ok(res, session, 201);
});

app.post("/api/cash/movements", allow("cash"), (req, res) => {
  const parsed = cashMovementSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa los datos del movimiento de caja.", parsed.error.flatten());
  const db = readStore();
  const session = db.cashSessions.find((item) => item.id === parsed.data.cashSessionId && item.status === "ABIERTA");
  if (!session) return fail(res, 409, "La caja seleccionada no está abierta.");
  const movement = addCashMovement(db, session, { ...parsed.data, sourceType: "MANUAL", sourceId: null }, req);
  audit(db, req, "CREATE", "CASH_MOVEMENT", movement.id, `${movement.type} ${movement.amount}`);
  writeStore(db);
  return ok(res, movement, 201);
});

app.post("/api/cash/close", allow("cash"), (req, res) => {
 if(!executive(req.user.role))return fail(res,403,"Solo jefe o gerente puede cerrar caja.");
  const parsed = cashCloseSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Revisa el monto contado.", parsed.error.flatten());
  const db = readStore();
  const session = db.cashSessions.find((item) => item.id === parsed.data.cashSessionId);
  if (!session) return fail(res, 404, "Sesión de caja no encontrada.");
  if (session.status !== "ABIERTA") return fail(res, 409, "La caja ya está cerrada.");
  session.expectedAmount = calculateCashExpected(db, session.id);
  session.countedAmount = parsed.data.countedAmount;
  session.difference = money(session.countedAmount - session.expectedAmount);
  session.closedAt = timestamp();
  session.closedBy = req.user.name;
  session.status = "CERRADA";
  audit(db, req, "CLOSE", "CASH", session.id, `${session.number} · diferencia ${session.difference}`);
  writeStore(db);
  return ok(res, session);
});

app.post("/api/users", allow("*"), async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "La contraseña debe tener 10 caracteres, mayúscula, minúscula, número y símbolo.", parsed.error.flatten());
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const db = readStore();
  if (db.users.some((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase())) return fail(res, 409, "Ese correo ya está registrado.");
  if (!db.locations.some((item) => item.id === parsed.data.locationId && item.active)) return fail(res, 400, "La sede seleccionada no existe.");
  const { password, ...fields } = parsed.data;
  const user = { id: randomUUID(), ...fields, active: true, passwordHash };
  db.users.push(user);
  audit(db, req, "CREATE", "USER", user.id, user.role);
  writeStore(db);
  return ok(res, safeUser(user), 201);
});

app.get("/api/backups/export", allow("backup"), (req, res) => {
  const db = readStore();
  audit(db, req, "EXPORT", "BACKUP", "operational", "Respaldo operativo JSON");
  writeStore(db);
  const backup = { ...db, exportedAt: timestamp(), exportedBy: req.user.name, users: db.users.map(safeUser) };
  const filename = `ingenacc-backup-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  return res.send(JSON.stringify(backup, null, 2));
});

app.get("/api/backups/database", allow("backup"), (req, res) => {
  const db = readStore();
  audit(db, req, "EXPORT", "BACKUP", "database", "Copia íntegra de la base SQLite");
  writeStore(db);
  const backup = createDatabaseBackup();
  const filename = `ingenacc-database-${new Date().toISOString().slice(0, 10)}.db`;
  res.setHeader("Content-Type", "application/vnd.sqlite3");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  return res.send(backup);
});

app.get("/api/backups/status", allow("backup"), (_req,res)=>ok(res,automaticBackupStatus()));
app.post("/api/backups/automatic", allow("backup"), (req,res)=>{
  try{const result=createAutomaticBackup();const db=readStore();audit(db,req,"CREATE","BACKUP","automatic",result.lastFile||"");writeStore(db);return ok(res,result,201);}
  catch(error){return fail(res,500,error instanceof Error?error.message:"No se pudo crear el respaldo automático.");}
});

const dist = path.resolve(sourceRoot, "../../client/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}
app.use((err, _req, res, _next) => {
  console.error(err);
  return fail(res, 500, err.message === "Origen no autorizado" ? err.message : "Ocurrió un error inesperado.");
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(port, process.env.HOST || "127.0.0.1", () => {console.log(`INGENACC ERP en http://localhost:${port}`);startAutomaticBackups();});
}

export { app, calculateCashExpected };
