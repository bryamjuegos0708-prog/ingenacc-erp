import { LogOut, Menu, Search, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { navForRole } from "../data/nav";
import { Brand } from "./Brand";
import { api, clearSession, getSession } from "../api";

export function AppShell({children,search,onSearch}:{children:ReactNode;search:string;onSearch:(value:string)=>void}){
  const [open,setOpen]=useState(false); const navigate=useNavigate(); const session=getSession(); const user=session!.user; const nav=navForRole(user.role);
  const [logoutError,setLogoutError]=useState("");
  const [loggingOut,setLoggingOut]=useState(false);
  const logout=async()=>{setLoggingOut(true);setLogoutError("");try{await api.logout();clearSession();navigate("/login",{replace:true});}catch{setLogoutError("No se pudo cerrar la sesión en el servidor. Reintenta cuando tengas conexión.");}finally{setLoggingOut(false);}};
  return <div className="admin-shell">
    <aside className={open?"sidebar open":"sidebar"}><div className="sidebar-head"><Brand/><button className="icon-button mobile-only" onClick={()=>setOpen(false)} aria-label="Cerrar menú"><X/></button></div><div className="sidebar-store"><strong>HONDA × INGENACC</strong><small>{user.locationName||"Sede asignada"}</small></div><nav>{nav.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==="/app"} onClick={()=>setOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>{logoutError ? <p role="alert">{logoutError}</p> : null}<button className="logout" disabled={loggingOut} onClick={logout}><LogOut size={18}/>Cerrar sesión</button></aside>
    <main className="admin-main"><header className="admin-top"><button className="icon-button mobile-only" onClick={()=>setOpen(true)} aria-label="Abrir menú"><Menu/></button><label className="search"><Search size={18}/><input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Buscar productos, clientes o comprobantes…"/></label><div className="profile"><span>{user.name.split(" ").map(p=>p[0]).slice(0,2).join("")}</span><div><strong>{user.name}</strong><small>{user.role.replace("_"," ")}</small></div></div></header>{children}</main>
  </div>
}
