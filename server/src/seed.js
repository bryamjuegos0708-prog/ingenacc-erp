import { randomBytes } from "node:crypto";

const temporaryPassword = () => `${randomBytes(18).toString("base64url")}Aa1!`;
export const testCredentials = {
  manager: temporaryPassword(),
  chief: temporaryPassword(),
  cashier: temporaryPassword(),
  sales: temporaryPassword(),
  warehouse: temporaryPassword()
};

export const seed = {
  demoMode: true,
  schemaVersion: 4,
  company: {
    legalName: "INGENACC Maquinarias y Equipos S.A.C.",
    tradeName: "INGENACC",
    ruc: "20607537764",
    address: "Av. César Vallejo 943, Aranjuez, Trujillo",
    taxRate: 0.18,
    currency: "PEN",
    electronicBilling: false,
    billingNotice: "Comprobantes internos de demostración. La integración electrónica SUNAT está fuera del MVP hasta definir proveedor, certificados y credenciales."
  },
  series: {
    FACTURA: { prefix: "F001", next: 4 },
    BOLETA: { prefix: "B001", next: 8 },
    NOTA_VENTA: { prefix: "NV01", next: 12 },
    COMPRA: { prefix: "OC", next: 2 },
    TRASLADO: { prefix: "TR", next: 25 },
    DEVOLUCION: { prefix: "DV", next: 1 },
    CAJA: { prefix: "CJ", next: 3 }
  },
  brands: [
{id:"bonhofer",name:"Bonhoeffer",status:"CONFIRMADA",storeType:"MULTIMARCA"},
{id:"italika",name:"Italika",status:"CONFIRMADA",storeType:"MULTIMARCA"},
{id:"makita",name:"Makita",status:"CONFIRMADA",storeType:"MULTIMARCA"},

    { id: "honda", name: "Honda", status: "VALIDADA", storeType: "MONOMARCA" },
    { id: "multimarca", name: "Multimarca", status: "PENDIENTE_VALIDACION", storeType: "MULTIMARCA" }
  ],
  locations: [
    { id: "t1", name: "Tienda Monomarca Honda", detail: "Exhibición, venta y repuestos Honda", kind: "TIENDA", active: true },
    { id: "t2", name: "Tienda Multimarca", detail: "Exhibición y venta de líneas multimarcas", kind: "TIENDA", active: true },
    { id: "sot", name: "Almacén Sótano", detail: "Recepción y stock de reserva", kind: "ALMACEN", active: true },
    { id: "p3", name: "Almacén Piso 3 Honda", detail: "Productos y repuestos Honda", kind: "ALMACEN", active: true },
    { id: "p4", name: "Almacén Piso 4 Multimarcas", detail: "Productos multimarcas agrupados", kind: "ALMACEN", active: true }
  ],
  products: [
    { id: "p1", code: "HON-MOT-001", barcode: "775000000001", manufacturerCode: "GX200", name: "Motor GX200", description: "Motor de uso multipropósito", brand: "Honda", model: "GX200", sector: "Agricultura", category: "Motores", subcategory: "Gasolina", unit: "UND", costPrice: 1280, price: 1650, minStock: 5, stock: { t1: 2, t2: 0, sot: 3, p3: 5, p4: 0 }, power: "5.5 HP", fuel: "Gasolina", origin: "Por validar", warranty: "12 meses", active: true },
    { id: "p2", code: "MUL-COM-014", barcode: "775000000014", manufacturerCode: "MS60", name: "Compactadora MS60", description: "Compactadora de placa para obras", brand: "Multimarca", model: "MS60", sector: "Construcción", category: "Compactadoras", subcategory: "Placa vibratoria", unit: "UND", costPrice: 1920, price: 2450, minStock: 4, stock: { t1: 0, t2: 2, sot: 1, p3: 0, p4: 2 }, power: "6.5 HP", fuel: "Gasolina", origin: "Por validar", warranty: "Por validar", active: true },
    { id: "p3", code: "HON-BOM-008", barcode: "775000000008", manufacturerCode: "WB30XT", name: "Motobomba WB30XT", description: "Motobomba para agua limpia", brand: "Honda", model: "WB30XT", sector: "Agricultura", category: "Bombas", subcategory: "Motobombas", unit: "UND", costPrice: 2260, price: 2890, minStock: 3, stock: { t1: 1, t2: 0, sot: 1, p3: 2, p4: 0 }, power: "3 pulgadas", fuel: "Gasolina", origin: "Por validar", warranty: "12 meses", active: true },
    { id: "p4", code: "MUL-GEN-021", barcode: "775000000021", manufacturerCode: "GEN-55D", name: "Generador diésel 5.5 kW", description: "Generador portátil para trabajo continuo", brand: "Multimarca", model: "Por validar", sector: "Multipropósito", category: "Generadores", subcategory: "Diésel", unit: "UND", costPrice: 3790, price: 4850, minStock: 3, stock: { t1: 0, t2: 1, sot: 2, p3: 0, p4: 3 }, power: "5.5 kW", fuel: "Diésel", origin: "Por validar", warranty: "Por validar", active: true },
    { id: "p5", code: "MUL-HER-032", barcode: "775000000032", manufacturerCode: "ROT-800", name: "Rotomartillo industrial", description: "Herramienta eléctrica de impacto", brand: "Multimarca", model: "Por validar", sector: "Construcción", category: "Herramientas eléctricas", subcategory: "Perforación", unit: "UND", costPrice: 650, price: 890, minStock: 6, stock: { t1: 0, t2: 3, sot: 2, p3: 0, p4: 4 }, power: "800 W", fuel: "Eléctrico", origin: "Por validar", warranty: "Por validar", active: true },
    { id: "p6", code: "HON-REP-103", barcode: "775000000103", manufacturerCode: "17210-ZE1", name: "Filtro de aire GX160/GX200", description: "Repuesto compatible con motores seleccionados", brand: "Honda", model: "17210-ZE1", sector: "Repuestos", category: "Filtros", subcategory: "Aire", unit: "UND", costPrice: 46, price: 68, minStock: 12, stock: { t1: 4, t2: 2, sot: 3, p3: 1, p4: 0 }, power: "—", fuel: "—", origin: "Por validar", warranty: "Por validar", active: true }
  ],
  clients: [
    { id: "c1", documentType: "RUC", documentNumber: "20481234567", name: "Constructora Norte S.A.C. (demo)", phone: "999 000 001", email: "", address: "Trujillo", active: true },
    { id: "c2", documentType: "DNI", documentNumber: "71234567", name: "Cliente mostrador", phone: "999 000 002", email: "", address: "Trujillo", active: true }
  ],
  suppliers: [
    { id: "s1", documentType: "RUC", documentNumber: "00000000001", name: "Proveedor Honda — datos por validar", contact: "Pendiente", phone: "Pendiente", email: "", address: "Pendiente", active: true },
    { id: "s2", documentType: "RUC", documentNumber: "00000000002", name: "Proveedor Multimarca — datos por validar", contact: "Pendiente", phone: "Pendiente", email: "", address: "Pendiente", active: true }
  ],
  movements: [
    { id: "m1", date: "2026-09-24T16:30:00.000Z", type: "SALIDA", productId: "p1", quantity: 1, from: "p3", to: null, reason: "Venta", responsible: "Bryam Plasencia", document: "B001-000007", balanceAfter: 10 },
    { id: "m2", date: "2026-09-24T15:12:00.000Z", type: "ENTRADA", productId: "p2", quantity: 2, from: null, to: "sot", reason: "Recepción de compra", responsible: "Dylan Arévalo", document: "OC-000001", balanceAfter: 5 },
    { id: "m3", date: "2026-09-24T13:45:00.000Z", type: "TRASLADO", productId: "p3", quantity: 1, from: "p3", to: "t1", reason: "Reposición de tienda", responsible: "Bryam Plasencia", document: "TR-000024", balanceAfter: 4 }
  ],
  invoices: [
    { id: "i1", number: "B001-000007", documentType: "BOLETA", date: "2026-09-24T16:30:00.000Z", clientId: "c2", locationId: "t1", cashSessionId: "cash1", items: [{ productId: "p1", quantity: 1, unitPrice: 1650 }], subtotal: 1398.31, tax: 251.69, total: 1650, paid: 1650, balance: 0, paymentStatus: "PAGADO", billingStatus: "INTERNO", seller: "Marcos Cabrera" },
    { id: "i2", number: "F001-000003", documentType: "FACTURA", date: "2026-09-24T11:15:00.000Z", clientId: "c1", locationId: "t2", cashSessionId: "cash2", items: [{ productId: "p2", quantity: 1, unitPrice: 2450 }], subtotal: 2076.27, tax: 373.73, total: 2450, paid: 1200, balance: 1250, paymentStatus: "PARCIAL", billingStatus: "INTERNO", seller: "Gerald Ramos" }
  ],
  payments: [
    { id: "pay1", invoiceId: "i1", cashSessionId: "cash1", date: "2026-09-24T16:31:00.000Z", amount: 1650, method: "EFECTIVO", reference: "Caja tienda Honda", receivedBy: "Grissel" },
    { id: "pay2", invoiceId: "i2", cashSessionId: "cash2", date: "2026-09-24T11:17:00.000Z", amount: 1200, method: "TRANSFERENCIA", reference: "Operación de demostración", receivedBy: "Grissel" }
  ],
  purchases: [
    { id: "pur1", number: "OC-000001", date: "2026-09-24T12:30:00.000Z", supplierId: "s2", locationId: "sot", items: [{ productId: "p2", quantity: 2, unitCost: 1920 }], subtotal: 3254.24, tax: 585.76, total: 3840, status: "RECIBIDA", reference: "Compra demostrativa", notes: "Datos del proveedor pendientes de validación", createdBy: "Grissel", receivedAt: "2026-09-24T15:12:00.000Z", receivedBy: "Dylan Arévalo" }
  ],
  transfers: [
    { id: "tr1", number: "TR-000024", date: "2026-09-24T13:45:00.000Z", productId: "p3", quantity: 1, from: "p3", to: "t1", reason: "Reposición de tienda", responsible: "Bryam Plasencia", status: "RECIBIDO" }
  ],
  returns: [],
  cashSessions: [
    { id: "cash1", number: "CJ-000001", locationId: "t1", userId: "u2", openedBy: "Grissel", openedAt: "2026-09-24T08:00:00.000Z", openingAmount: 300, status: "ABIERTA", closedAt: null, countedAmount: null, expectedAmount: null, difference: null },
    { id: "cash2", number: "CJ-000002", locationId: "t2", userId: "u2", openedBy: "Grissel", openedAt: "2026-09-24T08:10:00.000Z", openingAmount: 200, status: "CERRADA", closedAt: "2026-09-24T19:00:00.000Z", countedAmount: 200, expectedAmount: 200, difference: 0 }
  ],
  cashMovements: [
    { id: "cm1", cashSessionId: "cash1", date: "2026-09-24T16:31:00.000Z", type: "INGRESO", amount: 1650, method: "EFECTIVO", concept: "Venta B001-000007", reference: "B001-000007", sourceType: "VENTA", sourceId: "i1", responsible: "Grissel" },
    { id: "cm2", cashSessionId: "cash2", date: "2026-09-24T11:17:00.000Z", type: "INGRESO", amount: 1200, method: "TRANSFERENCIA", concept: "Abono F001-000003", reference: "F001-000003", sourceType: "PAGO", sourceId: "pay2", responsible: "Grissel" }
  ],
  users: [
    {id:"u5",name:"Jefatura de prueba",email:"jefe@ingenacc.pe",role:"JEFE",locationId:"t1",active:true,demoPassword:testCredentials.chief},
    { id: "u1", name: "John Cabrera", email: "gerencia@ingenacc.pe", role: "GERENTE", locationId: "t1", active: true, demoPassword: testCredentials.manager },
    { id: "u2", name: "Grissel", email: "caja@ingenacc.pe", role: "ADMINISTRACION", locationId: "t1", active: true, demoPassword: testCredentials.cashier },
    { id: "u3", name: "Bryam Plasencia", email: "ventas@ingenacc.pe", role: "VENTAS", locationId: "t2", active: true, demoPassword: testCredentials.sales },
    { id: "u4", name: "Dylan Arévalo", email: "almacen@ingenacc.pe", role: "ALMACEN", locationId: "sot", active: true, demoPassword: testCredentials.warehouse }
  ],
  quotes: [],
  audit: [
    { id: "a1", date: "2026-09-24T16:31:00.000Z", userId: "u2", userName: "Grissel", action: "CREATE", entity: "PAYMENT", entityId: "pay1", detail: "Pago de B001-000007" },
    { id: "a2", date: "2026-09-24T15:12:00.000Z", userId: "u4", userName: "Dylan Arévalo", action: "RECEIVE", entity: "PURCHASE", entityId: "pur1", detail: "OC-000001" }
  ]
};
