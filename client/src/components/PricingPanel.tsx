import {useState,type FormEvent} from "react";
import {api} from "../api";
import type {Bootstrap} from "../types";
export function PricingPanel({data,onReload}:{data:Bootstrap;onReload:()=>void}){
 const [id,setId]=useState(data.products[0]?.id || ""),[message,setMessage]=useState(""),[saving,setSaving]=useState(false);
 const product=data.products.find(p=>p.id===id);
 const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const payload=Object.fromEntries(new FormData(e.currentTarget));setSaving(true);setMessage("");try{await api.pricing(id,payload);setMessage("Precios actualizados y auditados.");onReload();}catch(error){setMessage(error instanceof Error?error.message:"No se pudo guardar");}finally{setSaving(false);}};
 return <details><summary>Administrar precios y costos · solo jefe y gerente</summary><form key={id} onSubmit={submit} className="form-grid"><label>Producto a actualizar<select value={id} onChange={e=>setId(e.target.value)}>{data.products.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label><label>Precio de venta<input name="price" type="number" min="0.01" step="0.01" defaultValue={product?.price} required/></label><label>Costo<input name="costPrice" type="number" min="0" step="0.01" defaultValue={product?.costPrice} required/></label><button className="button primary" disabled={saving||!id}>Guardar precios</button>{message?<p role="status">{message}</p>:null}</form></details>;
}
