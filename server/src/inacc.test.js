import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
import {allowedKnowledge,localAnswer,parseResponse,externalAnswer,inaccRoutes} from './inacc.js';
const privateMarker=randomUUID();
const db={demoMode:true,products:[{active:true,name:'Motobomba Honda WX10T',brand:'Honda',model:'WX10T',price:500,costPrice:123,stock:{secret:7}},{active:false,name:'Privado',model:privateMarker,price:100}],clients:[{name:privateMarker}],users:[{password:randomUUID()}]};
test('base pública, permisos y datos publicados',()=>{
 assert.ok(allowedKnowledge().every(k=>!k.staff));
 assert.ok(!allowedKnowledge({role:'ALMACEN'}).some(k=>k.id==='clientes'));
 assert.ok(allowedKnowledge({role:'GERENTE'}).some(k=>k.id==='backup'));
 assert.match(localAnswer('¿Cómo solicito una garantía?',db),/número de serie/);
 assert.match(localAnswer('precio WX10T',db),/500.00/);
 assert.match(localAnswer('precio WX10T',db),/DEMOSTRACIÓN/);
 assert.doesNotMatch(localAnswer('precio WX10T',db),/123|secret/);
 assert.match(localAnswer('secreto',db),/información suficiente/);
});
test('respuesta externa: citas y payload sin registros privados',async()=>{
 const result=await externalAnswer({message:'Ayúdame',history:[],db,user:{role:'GERENTE'},fetchImpl:async(url,opts)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');const p=JSON.parse(opts.body);assert.equal(p.store,false);
  assert.equal(opts.body.includes(privateMarker),false);assert.doesNotMatch(opts.body,/costPrice|"stock"/);
  return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:'Ver fuente.',annotations:[{type:'url_citation',url:'https://example.com',title:'Fuente',start_index:4,end_index:10},{type:'url_citation',url:'javascript:alert(1)',start_index:0,end_index:3}]}]}]})};
 }});
 assert.equal(result.citations.length,1);assert.equal(result.answer,'Ver fuente.');
 assert.throws(()=>parseResponse({output:[]}));assert.throws(()=>parseResponse({status:'incomplete',output:[]}));
 await assert.rejects(externalAnswer({message:'hola',history:[],db,fetchImpl:async()=>({ok:false})}));
});
test('rutas: validación, autorización, consentimiento y ausencia de escrituras',async(t)=>{
 const before=JSON.stringify(db);const app=express();app.use(express.json());
 const oldKey=process.env.OPENAI_API_KEY;const oldPublic=process.env.INACC_ALLOW_PUBLIC_AI;delete process.env.OPENAI_API_KEY;process.env.INACC_ALLOW_PUBLIC_AI='false';
 inaccRoutes(app,{readStore:()=>db,ok:(res,data)=>res.json({data}),fail:(res,code,message)=>res.status(code).json({message}),authenticate:(req,res,next)=>{if(req.headers.authorization!=='Bearer valid')return res.sendStatus(401);req.user={role:'GERENTE'};next();}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(async()=>{await new Promise(r=>server.close(r));if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;if(oldPublic===undefined)delete process.env.INACC_ALLOW_PUBLIC_AI;else process.env.INACC_ALLOW_PUBLIC_AI=oldPublic;});
 const base=`http://127.0.0.1:${server.address().port}`;
 const send=(body,auth)=>fetch(base+'/api/inacc/chat',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:auth}:{})},body:JSON.stringify(body)});
 assert.equal((await send({message:'garantía'})).status,200);
 assert.equal((await send({message:'hola',role:'GERENTE'})).status,400);
 assert.equal((await send({message:'hola'},'Bearer invalid')).status,401);
 assert.equal((await send({message:'hola',mode:'external',consent:true})).status,503);
 process.env.OPENAI_API_KEY='test-placeholder';
 assert.equal((await send({message:'hola',mode:'external',consent:true})).status,503);
 assert.equal((await send({message:'hola',mode:'external'},'Bearer valid')).status,400);
 const status=await fetch(base+'/api/inacc/status');assert.equal(status.headers.get('cache-control'),'no-store');assert.ok((await status.json()).data.faqs.every(k=>k.id!=='backup'));
 assert.equal(JSON.stringify(db),before);
});

test('la selección de catálogo encuentra modelos fuera de las primeras cuarenta filas sin datos privados',async()=>{
 const {relevantProducts}=await import('./inacc.js');
 const products=Array.from({length:60},(_,i)=>({active:true,name:'Equipo '+i,model:'ZZ'+i,brand:'Marca',price:100,costPrice:50,stock:{t1:4}}));
 const selected=relevantProducts('ZZ59',{products});
 assert.equal(selected.length,1);
 assert.equal(selected[0].model,'ZZ59');
 assert.equal('costPrice' in selected[0],false);
 assert.equal('stock' in selected[0],false);
});
