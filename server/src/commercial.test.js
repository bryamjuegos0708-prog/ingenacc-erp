import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const file=path.join(os.tmpdir(),`commercial-${randomUUID()}.db`);process.env.DATABASE_PATH=file;process.env.JWT_SECRET=randomBytes(48).toString('base64url');
const {app}=await import('./index.js');const {closeDatabase}=await import('./db/database.js');const {readStore,writeStore}=await import('./store.js');const {testCredentials}=await import('./seed.js');
test('proforma → adelanto → abono → entrega e historial persistente',async t=>{
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api`;
 t.after(async()=>{await new Promise(r=>server.close(r));closeDatabase();for(const s of ['', '-wal','-shm'])fs.rmSync(file+s,{force:true});});
 async function call(route,token,body,status=200){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d.data;}
 const token=(await call('/auth/login',null,{email:'gerencia@ingenacc.pe',password:testCredentials.manager})).token;
 const warehouse=(await call('/auth/login',null,{email:'almacen@ingenacc.pe',password:testCredentials.warehouse})).token;
 const sales=(await call('/auth/login',null,{email:'ventas@ingenacc.pe',password:testCredentials.sales})).token;
 let state=await call('/bootstrap',token);const cid=state.clients[0].id;
 if(!state.cashSessions.some(s=>s.locationId==='t1'&&s.status==='ABIERTA'))await call('/cash/open',token,{locationId:'t1',openingAmount:0},201);
 const body={clientId:cid,locationId:'t1',items:[{productId:'p1',quantity:100},{productId:'p1',quantity:2},{productId:'p2',quantity:2}],notes:'Encargo con entrega completa',discountAmount:50};
 await t.test('simular no modifica persistencia; permisos y cantidades',async()=>{
  const before=readStore();const sim=await call('/proformas/simulate',token,body);assert.equal(sim.items[0].quantity,102);assert.equal(sim.items.length,2);assert.equal(sim.total,102*before.products.find(p=>p.id==='p1').price+2*before.products.find(p=>p.id==='p2').price-50);assert.equal(Math.round((sim.subtotal+sim.tax)*100),Math.round(sim.total*100));assert.deepEqual(readStore(),before);
  await call('/proformas',warehouse,body,403);await call('/proformas',sales,body,400);await call('/proformas',token,{...body,items:[{productId:'p1',quantity:-1}]},400);
 });
 const q=await call('/proformas',token,body,201);assert.equal(new Date(q.expiresAt)-new Date(q.date),7*86400000);
 let order;const deposit={requestId:randomUUID(),amount:q.minimumDeposit,method:'EFECTIVO',reference:'50%'};
 await t.test('50%, reintento sin duplicar caja y precio congelado',async()=>{
  await call(`/proformas/${q.id}/order`,token,{...deposit,amount:q.minimumDeposit-0.01},400);
  const product=readStore().products.find(p=>p.id==='p1');await call('/products/p1/pricing',token,{price:product.price+100,costPrice:product.costPrice});assert.equal((await call('/proformas/simulate',token,body)).total,q.total+10200);
  const before=readStore();order=await call(`/proformas/${q.id}/order`,token,deposit,201);assert.equal(order.total,q.total);await call(`/proformas/${q.id}/order`,token,deposit);assert.equal(readStore().cashMovements.length,before.cashMovements.length+1);assert.deepEqual(readStore().products,before.products);await call(`/proformas/${q.id}/order`,token,{...deposit,requestId:randomUUID()},409);await call(`/customer-orders/${order.id}/deliver`,token,{},409);
 });
 await t.test('saldo idempotente, sobrepago y entrega sin stock',async()=>{
  const p={requestId:randomUUID(),amount:order.balance,method:'TRANSFERENCIA',reference:'Saldo'};await call(`/customer-orders/${order.id}/payments`,token,{...p,amount:order.balance+1},409);await call(`/customer-orders/${order.id}/payments`,token,p);const before=readStore();await call(`/customer-orders/${order.id}/payments`,token,p);assert.deepEqual(readStore(),before);await call(`/customer-orders/${order.id}/deliver`,token,{},409);
 });
 await t.test('entrega única sin segundo ingreso; historial y reinicio',async()=>{
  for(const l of q.items)await call('/movements',token,{type:'ENTRADA',productId:l.productId,quantity:l.quantity,to:'t1',reason:'Recepción física pedido',document:order.number},201);
  const before=readStore();const invoice=await call(`/customer-orders/${order.id}/deliver`,token,{},201);assert.equal(invoice.total,q.total);assert.equal(invoice.paid,q.total);assert.equal(invoice.deliveryStatus,'ENTREGADO');assert.equal(readStore().cashMovements.length,before.cashMovements.length);await call(`/customer-orders/${order.id}/deliver`,token,{});assert.equal(readStore().invoices.length,before.invoices.length+1);assert.equal(readStore().payments.filter(p=>p.invoiceId===invoice.id).length,2);
  closeDatabase();const after=await call('/bootstrap',token);assert.equal(after.customerOrders[0].invoiceId,invoice.id);assert.equal(after.proformas[0].id,q.id);assert.ok(after.invoices.some(i=>i.id===invoice.id&&i.clientId===cid));assert.equal((await call('/bootstrap',warehouse)).proformas.length,0);
 });
 await t.test('vencimiento no cobra ni crea pedido',async()=>{
  const expired=await call('/proformas',token,{...body,discountAmount:0},201);const db=readStore();db.proformas.find(p=>p.id===expired.id).expiresAt='2020-01-01T00:00:00Z';writeStore(db);const before=readStore();await call(`/proformas/${expired.id}/order`,token,{...deposit,requestId:randomUUID()},409);assert.deepEqual(readStore(),before);
 });
});
