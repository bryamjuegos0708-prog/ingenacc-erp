import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, getSession } from "../api";
import type { Location, Product } from "../types";
export function MovementModal({products,locations,onClose,onSaved}:{products:Product[];locations:Location[];onClose:()=>void;onSaved:()=>void}){
  const [type,setType]=useState("ENTRADA"),[direction,setDirection]=useState("ENTRADA"),[error,setError]=useState(""),[saving,setSaving]=useState(false);
  const responsible=getSession()?.user.name||"Usuario INGENACC";
  const needsOrigin=type==="SALIDA"||type==="TRASLADO"||(type==="AJUSTE"&&direction==="SALIDA");
  const needsDestination=type==="ENTRADA"||type==="TRASLADO"||(type==="AJUSTE"&&direction==="ENTRADA");
  const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();setSaving(true);setError("");const form=new FormData(e.currentTarget);try{await api.movement(Object.fromEntries(form));onSaved();onClose()}catch(err){setError(err instanceof Error?err.message:"Error") }finally{setSaving(false)}};
  return <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="movement-title"><div className="modal-head"><div><h2 id="movement-title">Registrar movimiento</h2><p>Actualiza el stock y conserva la trazabilidad a nombre de {responsible}.</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X/></button></div><form onSubmit={submit} className="form-grid">
    <label>Tipo<select name="type" value={type} onChange={e=>setType(e.target.value)}><option>ENTRADA</option><option>SALIDA</option><option>TRASLADO</option></select></label>
    {type==="AJUSTE"?<label>Dirección del ajuste<select name="direction" value={direction} onChange={e=>setDirection(e.target.value)}><option>ENTRADA</option><option>SALIDA</option></select></label>:null}
    <label>Producto<select name="productId" required><option value="">Selecciona</option>{products.map(p=><option value={p.id} key={p.id}>{p.code} · {p.name}</option>)}</select></label>
    <label>Cantidad<input name="quantity" type="number" min="1" required/></label>
    {needsOrigin?<label>Origen<select name="from" required><option value="">Selecciona</option>{locations.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></label>:null}
    {needsDestination?<label>Destino<select name="to" required><option value="">Selecciona</option>{locations.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></label>:null}
    <label>Motivo<input name="reason" required placeholder="Conteo físico, recepción, merma…"/></label><label>Comprobante<input name="document" required placeholder="Guía, acta o referencia"/></label>
    {error?<p className="form-error full">{error}</p>:null}<div className="form-actions full"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving?"Guardando…":"Guardar movimiento"}</button></div>
  </form></div></div>
}
