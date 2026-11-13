import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSession } from '../api';
import './InaccAssistant.css';
type Citation={url:string;title:string;start:number;end:number};
type Message={role:'user'|'assistant';content:string;source?:string;citations?:Citation[]};
type Status={externalAvailable:boolean;demoMode:boolean;faqs:{id:string;title:string}[]};
function Answer({message}:{message:Message}) {
  const parts:React.ReactNode[]=[];let cursor=0;
  for(const [i,c] of (message.citations||[]).sort((a,b)=>a.start-b.start).entries()) {
    if(!/^https?:\/\//.test(c.url)||c.start<cursor||c.end>message.content.length||c.end<=c.start)continue;
    parts.push(message.content.slice(cursor,c.start),<a key={i} href={c.url} target="_blank" rel="noopener noreferrer" title={c.title}>{message.content.slice(c.start,c.end)||c.title}</a>);cursor=c.end;
  }
  parts.push(message.content.slice(cursor));return <>{parts}</>;
}
export default function InaccAssistant(){
 const location=useLocation();const token=location.pathname.startsWith('/app')?getSession()?.token:undefined;
 return <Chat key={token||'public'} token={token}/>;
}
function Chat({token}:{token?:string}){
 const [open,setOpen]=useState(false),[status,setStatus]=useState<Status|null>(null),[messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[mode,setMode]=useState<'local'|'external'>('local'),[consent,setConsent]=useState(false);
 const controller=useRef<AbortController|null>(null),end=useRef<HTMLDivElement>(null),field=useRef<HTMLTextAreaElement>(null),launcher=useRef<HTMLButtonElement>(null);
 const headers:Record<string,string>={'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
 useEffect(()=>{const c=new AbortController();fetch('/api/inacc/status',{headers,signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(j=>setStatus(j.data)).catch(()=>{if(!c.signal.aborted)setError('No se pudo conectar con Inacc. Cierra y vuelve a abrir el chat.');});return()=>c.abort();},[token,open]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{if(open)field.current?.focus()},[open]);
 useEffect(()=>{end.current?.scrollIntoView({block:'nearest'})},[messages,busy]);
 const close=()=>{setOpen(false);launcher.current?.focus()};
 async function send(question=input){
  const text=question.trim();if(text.length<2||busy)return;
  if(mode==='external'&&(!status?.externalAvailable||!consent)){setError('Activa la autorización para consultar la IA externa.');return;}
  setError('');setBusy(true);setInput('');setMessages(m=>[...m,{role:'user',content:text}]);
  const c=new AbortController();controller.current=c;const timeout=setTimeout(()=>c.abort(),35000);
  try{
   const response=await fetch('/api/inacc/chat',{method:'POST',headers,signal:c.signal,body:JSON.stringify({message:text,mode,consent,history:messages.slice(-6).map(({role,content})=>({role,content:content.slice(0,4000)}))})});
   const result=await response.json();if(!response.ok)throw Error(result.message||'No se pudo completar la consulta.');
   setMessages(m=>[...m,{role:'assistant',content:result.data.answer,source:result.data.source,citations:result.data.citations}]);
  }catch(e){setError(c.signal.aborted?'Consulta cancelada o tiempo de espera agotado. Puedes volver a enviarla.':e instanceof Error?e.message:'Error de conexión.');setInput(text);setMessages(m=>m.slice(0,-1));}
  finally{clearTimeout(timeout);setBusy(false);controller.current=null;}
 }
 return <div className="inacc-widget">
  {!open&&<button ref={launcher} className="inacc-launch" onClick={()=>setOpen(true)} aria-label="Abrir consultor Inacc"><img src="/images/inacc.svg" alt=""/><span>Hola, soy <strong>Inacc</strong><small>¿En qué te ayudo?</small></span></button>}
  {open&&<section className="inacc-panel" role="dialog" aria-label="Consultor Inacc" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close()}}}>
   <header className="inacc-header"><img src="/images/inacc.svg" alt="Robot Inacc"/><div><strong>Inacc</strong><small>Tu asistente de INGENACC</small></div><button type="button" onClick={close} aria-label="Cerrar Inacc">×</button></header>
   <div className="inacc-modes"><button aria-pressed={mode==='local'} onClick={()=>{setMode('local');setError('')}} disabled={busy}>Ayuda INGENACC</button><button aria-pressed={mode==='external'} onClick={()=>{setMode('external');setError('')}} disabled={busy}>IA general</button><button title="Borrar conversación" aria-label="Borrar conversación" disabled={busy} onClick={()=>{setMessages([]);setInput('');setError('');setConsent(false)}}>Limpiar</button></div>
   {status?.demoMode&&<div className="inacc-notice">Demostración · productos y precios ficticios</div>}
   {mode==='external'&&<div className="inacc-consent">{status?.externalAvailable?<label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo enviar mi consulta y los últimos mensajes a OpenAI. No incluiré información personal ni contraseñas.</label>:<span>Para activar IA general, el administrador debe configurar OPENAI_API_KEY y OPENAI_MODEL en el servidor y reiniciarlo. Mientras tanto utiliza Ayuda INGENACC.</span>}</div>}
   <div className="inacc-conversation" role="log" aria-live="polite" aria-relevant="additions">
    <div className="inacc-message inacc-assistant"><strong>¡Hola! Soy Inacc 👋</strong><p>Te ayudo con inventario, compras, ventas y el uso del sistema. En IA general también puedes consultar sobre estudio, programación y otros temas.</p><small>Las respuestas locales usan una base de ayuda. La IA externa puede equivocarse. No realizo operaciones.</small></div>
    {messages.length===0&&<div className="inacc-faq">{status?.faqs.map(f=><button key={f.id} disabled={busy} onClick={()=>send(f.title)}>{f.title} <span>↗</span></button>)}</div>}
    {messages.map((m,i)=><div key={i} className={`inacc-message inacc-${m.role}`}><small>{m.role==='user'?'Tú':m.source||'Inacc'}</small><p><Answer message={m}/></p></div>)}
    {busy&&<p role="status">Inacc está preparando tu respuesta… <button onClick={()=>controller.current?.abort()}>Cancelar</button></p>}<div ref={end}/>
   </div>
   {error&&<div className="inacc-error" role="alert">{error}</div>}
   <form className="inacc-compose" onSubmit={e=>{e.preventDefault();void send()}}><label className="inacc-sr" htmlFor="inacc-question">Tu pregunta para Inacc</label><textarea id="inacc-question" ref={field} value={input} onChange={e=>setInput(e.target.value)} placeholder="Escribe tu pregunta…" maxLength={1200} rows={2} disabled={busy} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send()}}}/><button type="submit" disabled={busy||input.trim().length<2||(mode==='external'&&(!status?.externalAvailable||!consent))} aria-label="Enviar pregunta">Enviar ↑</button></form>
   <footer>Chat temporal · no se guarda en el historial de clientes</footer>
  </section>}
 </div>
}
