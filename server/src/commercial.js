import {z} from 'zod';
import {randomUUID} from 'node:crypto';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const input=z.object({clientId:z.string(),locationId:z.string(),items:z.array(z.object({productId:z.string(),quantity:z.number().int().positive().max(10000)})).min(1).max(100),discountAmount:z.number().nonnegative().default(0),notes:z.string().trim().max(1000).default('')});
const payment=z.object({requestId:z.string().uuid(),amount:z.number().positive().refine(n=>round(n)===n),method:z.enum(['EFECTIVO','TRANSFERENCIA','TARJETA','YAPE_PLIN']),reference:z.string().max(200).default('')});
export function commercialRoutes(app,h){
 const {allow,readStore,writeStore,ok,fail,executive,audit,available,findOpenCash,addCashMovement,nextNumber,deliver}=h;
 function calculate(db,body,role){
  const d=input.parse(body),client=db.clients.find(c=>c.id===d.clientId&&c.active);
  if(!client||!db.locations.some(l=>l.id===d.locationId&&l.active&&l.kind==='TIENDA'))throw Error('Selecciona cliente y tienda activos.');
  if(d.discountAmount&&!executive(role))throw Error('Solo jefe o gerente autoriza descuentos.');
  const quantities=new Map();for(const l of d.items)quantities.set(l.productId,(quantities.get(l.productId)||0)+l.quantity);
  const items=[...quantities].map(([id,quantity])=>{const p=db.products.find(p=>p.id===id&&p.active);if(!p||p.price<=0)throw Error('Producto sin precio vigente o inactivo.');return {productId:id,name:p.name,code:p.code,quantity,unitPrice:p.price,available:available(db,p,d.locationId)};});
  const gross=round(items.reduce((s,l)=>s+l.unitPrice*l.quantity,0));if(d.discountAmount>=gross)throw Error('Descuento inválido.');
  const total=round(gross-d.discountAmount),subtotal=round(total/(1+db.company.taxRate));
  return {...d,client:{name:client.name,documentNumber:client.documentNumber,address:client.address},items,total,subtotal,tax:round(total-subtotal),taxRate:db.company.taxRate,minimumDeposit:Math.ceil(total*100/2)/100};
 }
 for(const simulate of [true,false])app.post('/api/proformas'+(simulate?'/simulate':''),allow('sales'),(req,res)=>{
  const db=readStore();let q;try{q=calculate(db,req.body,req.user.role);}catch(e){return fail(res,400,e instanceof z.ZodError?'Revisa cliente, productos y cantidades.':e.message);}
  if(simulate)return ok(res,q);
  const date=new Date(),expiresAt=new Date(date.getTime()+7*86400000).toISOString();
  q={...q,id:randomUUID(),number:`PRO-${String(db.proformas.length+1).padStart(6,'0')}`,date:date.toISOString(),expiresAt,status:'VIGENTE',createdBy:req.user.name};
  db.proformas.unshift(q);audit(db,req,'CREATE','PROFORMA',q.id,q.number);writeStore(db);return ok(res,q,201);
 });
 app.post('/api/proformas/:id/order',allow('sales'),(req,res)=>{
  const parsed=payment.safeParse(req.body);if(!parsed.success)return fail(res,400,'Indica adelanto y medio de pago válidos.');
  const db=readStore(),q=db.proformas.find(q=>q.id===req.params.id);if(!q)return fail(res,404,'Proforma no encontrada.');
  const existing=db.customerOrders.find(o=>o.proformaId===q.id);if(existing){const prior=existing.payments[0];if(prior.requestId!==parsed.data.requestId||prior.amount!==parsed.data.amount||prior.method!==parsed.data.method||prior.reference!==parsed.data.reference)return fail(res,409,'La proforma ya tiene un pedido. Consulta el historial.');return ok(res,existing);}
  if(new Date(q.expiresAt)<=new Date())return fail(res,409,'Proforma vencida. Genera otra con precios actuales.');
  const p=parsed.data;if(p.amount<q.minimumDeposit||p.amount>q.total)return fail(res,400,'El adelanto debe cubrir al menos el 50 % y no superar el total.');
  if(!db.clients.some(c=>c.id===q.clientId&&c.active)||q.items.some(l=>!db.products.some(p=>p.id===l.productId&&p.active)))return fail(res,409,'Cliente o producto inactivo.');
  if(db.customerOrders.some(o=>o.payments.some(x=>x.requestId===p.requestId)))return fail(res,409,'Identificador de pago ya utilizado.');
  const cash=findOpenCash(db,q.locationId);if(!cash)return fail(res,409,'Abre una caja en la tienda del pedido.');
  const order={id:randomUUID(),number:`PED-${String(db.customerOrders.length+1).padStart(6,'0')}`,proformaId:q.id,clientId:q.clientId,locationId:q.locationId,date:new Date().toISOString(),status:'PENDIENTE',total:q.total,paid:p.amount,balance:round(q.total-p.amount),payments:[{...p,date:new Date().toISOString(),cashSessionId:cash.id,receivedBy:req.user.name}],invoiceId:null};
  db.customerOrders.unshift(order);q.status='ACEPTADA';addCashMovement(db,cash,{type:'INGRESO',amount:p.amount,method:p.method,concept:`Adelanto ${order.number}`,reference:p.reference,sourceType:'PEDIDO',sourceId:order.id},req);audit(db,req,'CREATE','CUSTOMER_ORDER',order.id,order.number);writeStore(db);return ok(res,order,201);
 });
 app.post('/api/customer-orders/:id/payments',allow('payments'),(req,res)=>{
  const parsed=payment.safeParse(req.body);if(!parsed.success)return fail(res,400,'Revisa el abono.');
  const db=readStore(),o=db.customerOrders.find(o=>o.id===req.params.id);if(!o)return fail(res,404,'Pedido no encontrado.');
  const p=parsed.data,prior=o.payments.find(x=>x.requestId===p.requestId);if(prior){if(prior.amount!==p.amount||prior.method!==p.method||prior.reference!==p.reference)return fail(res,409,'El identificador ya corresponde a otro pago.');return ok(res,o);}
  if(db.customerOrders.some(o=>o.payments.some(x=>x.requestId===p.requestId)))return fail(res,409,'Identificador de pago ya utilizado.');
  if(o.status==='ENTREGADO'||p.amount>o.balance)return fail(res,409,'El pago supera el saldo o el pedido ya fue entregado.');
  const cash=findOpenCash(db,o.locationId);if(!cash)return fail(res,409,'Abre caja en la tienda del pedido.');
  o.payments.push({...p,date:new Date().toISOString(),cashSessionId:cash.id,receivedBy:req.user.name});o.paid=round(o.paid+p.amount);o.balance=round(o.total-o.paid);
  addCashMovement(db,cash,{type:'INGRESO',amount:p.amount,method:p.method,concept:`Abono ${o.number}`,reference:p.reference,sourceType:'PEDIDO',sourceId:o.id},req);audit(db,req,'PAY','CUSTOMER_ORDER',o.id,String(p.amount));writeStore(db);return ok(res,o);
 });
 app.post('/api/customer-orders/:id/deliver',allow('sales'),(req,res)=>{
  const db=readStore(),o=db.customerOrders.find(o=>o.id===req.params.id);if(!o)return fail(res,404,'Pedido no encontrado.');
  if(o.invoiceId)return ok(res,db.invoices.find(i=>i.id===o.invoiceId));
  if(o.balance!==0)return fail(res,409,'Completa el pago antes de entregar.');
  const q=db.proformas.find(q=>q.id===o.proformaId);
  for(const l of q.items){const p=db.products.find(p=>p.id===l.productId);if(!p||!p.active||available(db,p,o.locationId)<l.quantity)return fail(res,409,'No hay stock disponible para la entrega completa. Registra la recepción o traslado primero.');}
  const invoice={id:randomUUID(),number:nextNumber(db,'NOTA_VENTA'),documentType:'NOTA_VENTA',date:new Date().toISOString(),clientId:o.clientId,locationId:o.locationId,cashSessionId:o.payments[0].cashSessionId,items:q.items.map(({productId,quantity,unitPrice})=>({productId,quantity,unitPrice})),subtotal:q.subtotal,tax:q.tax,total:q.total,paid:q.total,balance:0,paymentStatus:'PAGADO',billingStatus:'INTERNO',seller:req.user.name,discountAmount:q.discountAmount,deliveryStatus:'RESERVADO'};
  deliver(db,invoice,req);db.invoices.unshift(invoice);
  for(const p of o.payments)db.payments.unshift({id:randomUUID(),invoiceId:invoice.id,cashSessionId:p.cashSessionId,date:p.date,amount:p.amount,method:p.method,reference:`${o.number} ${p.reference}`,receivedBy:p.receivedBy});
  o.invoiceId=invoice.id;o.status='ENTREGADO';o.deliveredAt=new Date().toISOString();audit(db,req,'DELIVER','CUSTOMER_ORDER',o.id,invoice.number);writeStore(db);return ok(res,invoice,201);
 });
}
