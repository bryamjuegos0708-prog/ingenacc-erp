import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const databasePath = path.join(os.tmpdir(), `ingenacc-workflows-${randomUUID()}.db`);
process.env.DATABASE_PATH = databasePath;
process.env.JWT_SECRET = randomBytes(48).toString("base64url");
const {app} = await import("./index.js");
const {closeDatabase} = await import("./db/database.js");
const {testCredentials} = await import("./seed.js");

test("flujos funcionales con persistencia y autorización", async t => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve)); closeDatabase();
    for (const suffix of ["", "-wal", "-shm", ".backup"]) fs.rmSync(databasePath + suffix, {force:true});
  });
  async function call(route, token, payload, expected=200) {
    const response = await fetch(base + "/api" + route, {method:payload === undefined ? "GET" : "POST", headers:{"Content-Type":"application/json", ...(token ? {Authorization:`Bearer ${token}`} : {})}, body:payload === undefined ? undefined : JSON.stringify(payload)});
    const body = await response.json(); assert.equal(response.status, expected, JSON.stringify(body)); return body.data;
  }
  const manager = (await call("/auth/login", null, {email:"gerencia@ingenacc.pe",password:testCredentials.manager})).token;
  const warehouse = (await call("/auth/login", null, {email:"almacen@ingenacc.pe",password:testCredentials.warehouse})).token;
  const snapshot = () => call("/bootstrap", manager);
  const stock = async () => (await snapshot()).products.find(p=>p.id==="p1").stock.t1;
  await t.test("CF05/06 entrada, salida y rechazo sin cambios", async () => {
    const before = await stock();
    await call("/movements", warehouse, {type:"ENTRADA",productId:"p1",quantity:10,to:"t1",reason:"Recepción prueba",document:"TEST-01"},201);
    assert.equal(await stock(),before+10);
    await call("/movements", warehouse, {type:"SALIDA",productId:"p1",quantity:2,from:"t1",reason:"Despacho prueba",document:"TEST-02"},201);
    const state = await snapshot();
    await call("/movements", warehouse, {type:"SALIDA",productId:"p1",quantity:99999,from:"t1",reason:"Rechazo prueba",document:"TEST-03"},409);
    assert.deepEqual(await snapshot(),state);
  });
  await t.test("CF10 recepción parcial, reintento idempotente y exceso rechazado", async () => {
    const before = await stock();
    const order = await call("/purchases",manager,{supplierId:"s2",locationId:"t1",items:[{productId:"p1",quantity:5,unitCost:1200}]},201);
    const payload = {requestId:randomUUID(),items:[{line:0,quantity:2}]};
    const partial = await call(`/purchases/${order.id}/receive`,warehouse,payload);
    assert.equal(partial.status,"PENDIENTE"); assert.equal(partial.items[0].receivedQuantity,2);
    await call(`/purchases/${order.id}/receive`,warehouse,payload);
    assert.equal(await stock(),before+2);
    const state = await snapshot();
    await call(`/purchases/${order.id}/receive`,warehouse,{requestId:randomUUID(),items:[{line:0,quantity:4}]},409);
    assert.deepEqual(await snapshot(),state);
    const complete = await call(`/purchases/${order.id}/receive`,warehouse,{requestId:randomUUID(),items:[{line:0,quantity:3}]});
    assert.equal(complete.status,"RECIBIDA");assert.equal(await stock(),before+5);
  });
  await t.test("CF09 conteo autorizado, duplicación y stock obsoleto", async () => {
    const before = await stock();
    const count = await call("/physical-counts",warehouse,{productId:"p1",locationId:"t1",counted:before-1,reason:"Conteo de prueba"},201);
    assert.equal(await stock(),before);
    await call(`/physical-counts/${count.id}/review`,warehouse,{approve:true},403);
    await call(`/physical-counts/${count.id}/review`,manager,{approve:true});
    assert.equal(await stock(),before-1);
    await call(`/physical-counts/${count.id}/review`,manager,{approve:true},409);
    await call("/movements",manager,{type:"AJUSTE",productId:"p1",quantity:1,to:"t1",reason:"Sin autorización",document:"BAD"},403);
    const stale = await call("/physical-counts",warehouse,{productId:"p1",locationId:"t1",counted:before,reason:"Conteo obsoleto"},201);
    await call("/movements",warehouse,{type:"ENTRADA",productId:"p1",quantity:1,to:"t1",reason:"Entrega posterior",document:"TEST-04"},201);
    await call(`/physical-counts/${stale.id}/review`,manager,{approve:true},409);
    await call(`/physical-counts/${stale.id}/review`,manager,{approve:false});
  });
  await t.test("CF11 venta pagada conecta inventario, Kardex y caja", async () => {
    const before = await snapshot();
    const invoice = await call("/sales",manager,{documentType:"NOTA_VENTA",clientId:"c1",locationId:"t1",items:[{productId:"p1",quantity:1}],initialPayment:1650,paymentMethod:"EFECTIVO"},201);
    const after = await snapshot();
    assert.equal(invoice.balance,0);
    assert.equal(after.products.find(p=>p.id==="p1").stock.t1,before.products.find(p=>p.id==="p1").stock.t1-1);
    assert.equal(after.movements.length,before.movements.length+1);
    assert.equal(after.payments.length,before.payments.length+1);
    assert.equal(after.cashMovements.length,before.cashMovements.length+1);
    await call("/sales",manager,{documentType:"NOTA_VENTA",clientId:"c1",locationId:"t1",items:[{productId:"p1",quantity:999999}],initialPayment:1,paymentMethod:"EFECTIVO"},409);
    assert.deepEqual(await snapshot(),after);
  });
  await t.test("reglas de empresa: permisos, adelanto, entrega completa y series", async () => {
    const admin=(await call("/auth/login",null,{email:"caja@ingenacc.pe",password:testCredentials.cashier})).token;
    const sales=(await call("/auth/login",null,{email:"ventas@ingenacc.pe",password:testCredentials.sales})).token;
    const chief=(await call("/auth/login",null,{email:"jefe@ingenacc.pe",password:testCredentials.chief})).token;
    for(const token of [admin,sales,warehouse]) {
      const view=await call("/bootstrap",token);
      assert.ok(view.products.every(p=>!("costPrice" in p)));
      assert.ok(view.purchases.every(p=>p.total===null && p.items.every(l=>!("unitCost" in l))));
      await call("/products/p1/pricing",token,{price:100,costPrice:50},403);
      await call("/cash/close",token,{cashSessionId:"cash1",countedAmount:0},403);
    }
    const chiefView=await call("/bootstrap",chief);assert.equal(chiefView.users.find(u=>u.email==="jefe@ingenacc.pe").role,"JEFE");
    const payload={documentType:"NOTA_VENTA",clientId:"c1",locationId:"t1",items:[{productId:"p1",quantity:1}],initialPayment:100,paymentMethod:"EFECTIVO"};
    await call("/sales",sales,{...payload,discountAmount:10},403);
    await call("/sales",sales,{...payload,initialPayment:0},400);
    await call("/sales",sales,{...payload,paymentMethod:"CREDITO"},400);
    const before=await stock();
    const order=await call("/sales",chief,{...payload,discountAmount:50},201);
    assert.equal(order.total,1600);assert.equal(order.deliveryStatus,"RESERVADO");assert.equal(await stock(),before);
    const view=await snapshot();assert.equal(view.products.find(p=>p.id==="p1").availableStock.t1,before-1);
    await call("/movements",warehouse,{type:"SALIDA",productId:"p1",quantity:before,from:"t1",reason:"Invadir reserva",document:"BLOCK"},409);
    await call("/equipment",chief,{invoiceId:order.id,productId:"p1",serial:"TEST-SERIE-001",warrantyDays:365},409);
    await call("/payments",sales,{invoiceId:order.id,amount:1500,method:"EFECTIVO",reference:"Saldo prueba"},201);
    assert.equal(await stock(),before-1);
    const delivered=(await snapshot()).invoices.find(i=>i.id===order.id);assert.equal(delivered.deliveryStatus,"ENTREGADO");
    const equipment=await call("/equipment",chief,{invoiceId:order.id,productId:"p1",serial:"TEST-SERIE-001",warrantyDays:365},201);
    await call("/equipment",chief,{invoiceId:order.id,productId:"p1",serial:"test-serie-001",warrantyDays:365},409);
    const service=await call("/service-cases",sales,{equipmentId:equipment.id,kind:"GARANTIA",description:"Motor no enciende, revisar"},201);
    await call(`/service-cases/${service.id}/status`,sales,{status:"DIAGNOSTICO",resolution:"Revisión preliminar"},403);
    await call(`/service-cases/${service.id}/status`,chief,{status:"ENTREGADO",resolution:"Salto de etapas"},409);
    await call(`/service-cases/${service.id}/status`,chief,{status:"DIAGNOSTICO",resolution:"Revisión preliminar"});
    closeDatabase();const persisted=await snapshot();assert.equal(persisted.equipment.find(e=>e.id===equipment.id).serial,"TEST-SERIE-001");assert.equal(persisted.serviceCases.find(c=>c.id===service.id).status,"DIAGNOSTICO");
    await call("/returns",chief,{invoiceId:order.id,productId:"p1",quantity:1,reason:"Sin devoluciones"},403);
  });
  await t.test("dos solicitudes simultáneas no venden dos veces el mismo stock",async()=>{
    const state=await snapshot(),product=state.products.find(p=>p.id==="p1"),quantity=product.availableStock.t1;
    const payload={documentType:"NOTA_VENTA",clientId:"c1",locationId:"t1",items:[{productId:"p1",quantity}],initialPayment:quantity*product.price,paymentMethod:"EFECTIVO"};
    const responses=await Promise.all([1,2].map(()=>fetch(base+"/api/sales",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${manager}`},body:JSON.stringify(payload)})));
    assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
    assert.equal((await snapshot()).products.find(p=>p.id==="p1").availableStock.t1,0);
  });
  await t.test("respaldo descargado se abre y conserva datos y relaciones", async () => {
    const response = await fetch(base+"/api/backups/database",{headers:{Authorization:`Bearer ${manager}`}});
    assert.equal(response.status,200);fs.writeFileSync(databasePath+".backup",Buffer.from(await response.arrayBuffer()));
    const backup = new DatabaseSync(databasePath+".backup");
    try {assert.equal(backup.prepare("PRAGMA integrity_check").get().integrity_check,"ok");assert.deepEqual(backup.prepare("PRAGMA foreign_key_check").all(),[]);assert.equal(backup.prepare("SELECT COUNT(*) AS n FROM purchase_receipts").get().n,2);assert.ok(backup.prepare("SELECT COUNT(*) AS n FROM invoices").get().n>2);} finally {backup.close();}
  });
  await t.test("CF01 cerrar sesión invalida el token incluso tras reabrir BD", async () => {
    await call("/auth/logout",warehouse,{});closeDatabase();
    await call("/bootstrap",warehouse,undefined,401);
    await snapshot();
  });
});
