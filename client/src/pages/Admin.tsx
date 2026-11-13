import {CommercialPanel} from "../components/CommercialPanel";
import { AlertTriangle, ArrowDownRight, ArrowLeftRight, ArrowUpRight, Boxes, CircleDollarSign, DatabaseBackup, Download, FileSpreadsheet, FileWarning, MapPin, PackageCheck, Plus, ReceiptText, RotateCcw, SearchX, ShieldCheck, ShoppingCart, Truck, UsersRound, WalletCards, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ApiError, api, newRequestId, clearSession, getSession } from "../api";
import type { Bootstrap, Product, Role } from "../types";
import { PricingPanel } from "../components/PricingPanel";
import { ServicePanel } from "../components/ServicePanel";
import { AppShell } from "../components/AppShell";
import { MovementModal } from "../components/MovementModal";
import { CashModal, ClientModal, PaymentModal, ProductModal, PurchaseModal, ReturnModal, SaleModal, SupplierModal, TransferModal, UserModal } from "../components/OperationsModal";
import { ProductImportModal } from "../components/ProductImportModal";

const total = (product:Product) => Object.values(product.stock).reduce((sum, value) => sum + value, 0);
const money = (value:number) => new Intl.NumberFormat("es-PE", { style:"currency", currency:"PEN" }).format(value);
const formatDate = (value:string) => new Intl.DateTimeFormat("es-PE", { dateStyle:"short", timeStyle:"short", timeZone:"America/Lima" }).format(new Date(value));
const matches = (search:string, values:Array<string|number|undefined|null>) => values.join(" ").toLowerCase().includes(search.toLowerCase());

const titles:Record<string,string> = {
 "/app/proformas":"Proformas y pedidos",
  "/app/garantias":"Series, garantías y servicio técnico", "/app":"Dashboard", "/app/productos":"Productos", "/app/inventario":"Inventario por ubicación", "/app/movimientos":"Kardex y movimientos",
  "/app/conteos":"Conteos físicos", "/app/traslados":"Traslados", "/app/proveedores":"Proveedores", "/app/compras":"Compras y recepción", "/app/clientes":"Clientes",
  "/app/ventas":"Ventas / POS", "/app/facturacion":"Facturación", "/app/pagos":"Pagos", "/app/caja":"Caja",
  "/app/devoluciones":"Devoluciones", "/app/ubicaciones":"Ubicaciones", "/app/reportes":"Reportes", "/app/auditoria":"Auditoría",
  "/app/usuarios":"Usuarios y roles", "/app/configuracion":"Configuración y respaldo"
};

type Action = "movement"|"product"|"product-import"|"client"|"sale"|"payment"|"user"|"supplier"|"purchase"|"transfer"|"return"|"cash-open"|"cash-movement"|"cash-close"|null;
const pageRoles:Record<string,Role[]> = {
 proformas:["JEFE","GERENTE","ADMINISTRACION","VENTAS"],
 garantias:["JEFE","GERENTE","ADMINISTRACION","VENTAS"],
  conteos:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"], movimientos:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"], traslados:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"], proveedores:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"],
  compras:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"], clientes:["JEFE","GERENTE","ADMINISTRACION","VENTAS"], ventas:["JEFE","GERENTE","ADMINISTRACION","VENTAS"],
  facturacion:["JEFE","GERENTE","ADMINISTRACION","VENTAS"], pagos:["JEFE","GERENTE","ADMINISTRACION","VENTAS"], caja:["JEFE","GERENTE"],
  devoluciones:[], ubicaciones:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"],
  reportes:["JEFE","GERENTE"], auditoria:["JEFE","GERENTE"], usuarios:["JEFE","GERENTE"], configuracion:["JEFE","GERENTE"]
};

export default function Admin() {
  const [data, setData] = useState<Bootstrap|null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Action>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getSession()!.user;
  const load = useCallback(() => api.bootstrap().then((result) => { setData(result); setError(""); }).catch((reason) => {
    if (reason instanceof ApiError && reason.status === 401) { clearSession(); navigate("/login", { replace:true }); return; }
    setError(reason instanceof Error ? reason.message : "No se pudo conectar con la API");
  }), [navigate]);
  useEffect(() => { load(); }, [load]);

  const segment = location.pathname.split("/")[2] || "";
  const permitted = !pageRoles[segment] || pageRoles[segment].includes(user.role);
  const actionByPath:Record<string,{type:Action; label:string}> = {
    "/app/productos":{ type:"product", label:"Nuevo producto" }, "/app/movimientos":{ type:"movement", label:"Registrar movimiento" },
    "/app/traslados":{ type:"transfer", label:"Nuevo traslado" }, "/app/proveedores":{ type:"supplier", label:"Nuevo proveedor" },
    "/app/compras":{ type:"purchase", label:"Nueva compra" }, "/app/clientes":{ type:"client", label:"Nuevo cliente" },
    "/app/ventas":{ type:"sale", label:"Nueva venta" }, "/app/facturacion":{ type:"sale", label:"Emitir comprobante" },
    "/app/pagos":{ type:"payment", label:"Registrar pago" }, "/app/devoluciones":{ type:"return", label:"Nueva devolución" },
    "/app/usuarios":{ type:"user", label:"Nuevo usuario" }
  };
  let action = actionByPath[location.pathname];
  if(["/app/productos","/app/compras"].includes(location.pathname)&&!["JEFE","GERENTE"].includes(user.role))action=undefined!;
  if (data && location.pathname === "/app/caja") action = data.cashSessions.some((item) => item.status === "ABIERTA") ? { type:"cash-movement", label:"Movimiento de caja" } : { type:"cash-open", label:"Abrir caja" };

  if (error) return <div className="fatal" role="alert"><h1>No se pudo conectar con la API</h1><p>{error}</p><button className="button primary" onClick={load}>Volver a intentar</button><small>En la PC principal confirma que la ventana de INGENACC siga abierta.</small></div>;
  if (!data) return <div className="page-loader">Cargando operación…</div>;

  return <AppShell search={search} onSearch={setSearch}>
    <section className="admin-content">
      {data.demoMode ? <div className="demo-banner" role="status"><strong>ENTORNO DE DEMOSTRACIÓN</strong> · Clientes, precios y operaciones ficticios para capacitación.</div> : null}
      <div className="admin-heading"><div><h1>{titles[location.pathname] || "INGENACC ERP"}</h1><p>{data.company.legalName} · {user.locationName || "Sede asignada"}</p></div><div className="heading-actions">{location.pathname==="/app/productos"&&["JEFE","GERENTE"].includes(user.role)?<button className="button secondary" onClick={()=>setModal("product-import")}><FileSpreadsheet size={18}/>Importar Excel</button>:null}{action && permitted ? <button className="button primary" onClick={() => setModal(action.type)}><Plus size={18}/>{action.label}</button> : null}</div></div>
      <nav className="quick-actions" aria-label="Acciones frecuentes">
        <button className="button secondary" onClick={()=>{setSearch("");navigate("/app/inventario")}}>Consultar existencias</button>
        <button className="button secondary" onClick={()=>{setSearch("motor");navigate("/app/productos")}}>Buscar motores</button>
        {pageRoles.ventas.includes(user.role)&&<button className="button primary" onClick={()=>setModal("sale")}>Nueva venta</button>}
        {pageRoles.clientes.includes(user.role)&&<button className="button secondary" onClick={()=>setModal("client")}>Nuevo cliente</button>}
        {pageRoles.movimientos.includes(user.role)&&<button className="button secondary" onClick={()=>setModal("movement")}>Entrada o salida</button>}
        {pageRoles.conteos.includes(user.role)&&<button className="button secondary" onClick={()=>{setSearch("");navigate("/app/conteos")}}>Contar inventario</button>}
        <button className="button secondary" onClick={()=>setSearch("")}>Limpiar búsqueda</button>
      </nav>
      {permitted ? <Routes>
        <Route index element={<Dashboard data={data}/>}/>
        <Route path="garantias" element={<ServicePanel data={data} onReload={load}/>}/>
        <Route path="productos" element={<Products data={data} search={search} onReload={load}/>}/>
        <Route path="conteos" element={<PhysicalCounts data={data} onReload={load}/>}/>
        <Route path="inventario" element={<Inventory data={data} search={search}/>}/>
        <Route path="movimientos" element={<Movements data={data} search={search}/>}/>
        <Route path="traslados" element={<Transfers data={data} search={search}/>}/>
        <Route path="proveedores" element={<Suppliers data={data} search={search}/>}/>
        <Route path="compras" element={<Purchases data={data} search={search} onReload={load}/>}/>
        <Route path="clientes" element={<CommercialPanel key="history" data={data} onReload={load} historyOnly search={search}/>}/>
        <Route path="proformas" element={<CommercialPanel key="proformas" data={data} onReload={load}/>}/>
        <Route path="ventas" element={<Sales data={data} search={search}/>}/>
        <Route path="facturacion" element={<Billing data={data} search={search}/>}/>
        <Route path="pagos" element={<Payments data={data} search={search}/>}/>
        <Route path="caja" element={<Cash data={data} onOpen={() => setModal("cash-open")} onMovement={() => setModal("cash-movement")} onClose={() => setModal("cash-close")}/>}/>
        <Route path="devoluciones" element={<Returns data={data} search={search}/>}/>
        <Route path="ubicaciones" element={<Locations data={data}/>}/>
        <Route path="reportes" element={<Reports data={data}/>}/>
        <Route path="auditoria" element={<Audit data={data} search={search}/>}/>
        <Route path="usuarios" element={<Users data={data}/>}/>
        <Route path="configuracion" element={<Configuration data={data}/>}/>
        <Route path="*" element={<Navigate to="/app" replace/>}/>
      </Routes> : <AccessDenied/>}
    </section>
    {modal === "movement" ? <MovementModal products={data.products} locations={data.locations} onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "product" ? <ProductModal data={data} onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "product-import" ? <ProductImportModal data={data} onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "client" ? <ClientModal onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "supplier" ? <SupplierModal onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "purchase" ? <PurchaseModal data={data} onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "transfer" ? <TransferModal data={data} onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "sale" ? <SaleModal data={data} onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "payment" ? <PaymentModal data={data} onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "return" ? <ReturnModal data={data} onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "cash-open" ? <CashModal data={data} mode="open" onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "cash-movement" ? <CashModal data={data} mode="movement" onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "cash-close" ? <CashModal data={data} mode="close" onClose={() => setModal(null)} onSaved={load}/> : null}
    {modal === "user" ? <UserModal data={data} onClose={() => setModal(null)} onSaved={load}/> : null}
  </AppShell>;
}

function Dashboard({ data }:{ data:Bootstrap }) {
  const units = data.products.reduce((sum, product) => sum + total(product), 0);
  const low = data.products.filter((product) => total(product) <= product.minStock);
  const revenue = data.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const pending = data.invoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const pendingPurchases = data.purchases.filter((item) => item.status === "PENDIENTE");
  const openCash = data.cashSessions.filter((item) => item.status === "ABIERTA");
  const productMap = new Map(data.products.map((item) => [item.id, item]));
  const clientMap = new Map(data.clients.map((item) => [item.id, item]));
  if (getSession()?.user.role === "ALMACEN") return <><div className="kpi-grid"><Kpi icon={Boxes} label="Unidades en stock" value={units}/><Kpi icon={PackageCheck} label="Compras pendientes" value={pendingPurchases.length}/><Kpi icon={AlertTriangle} label="Productos por reponer" value={low.length}/></div><Inventory data={data} search=""/></>;
  return <>
    <div className="brand-operations"><strong>HONDA</strong><span/><b>INGENACC</b><small>Operación monomarca y multimarca · Trujillo</small></div>
    <div className="kpi-grid kpi-grid-6"><Kpi icon={ShoppingCart} label="Ventas registradas" value={money(revenue)}/><Kpi icon={ReceiptText} label="Comprobantes" value={data.invoices.length}/><Kpi icon={CircleDollarSign} label="Saldo pendiente" value={money(pending)} danger={pending > 0}/><Kpi icon={Boxes} label="Unidades en stock" value={units}/><Kpi icon={PackageCheck} label="Compras pendientes" value={pendingPurchases.length} danger={pendingPurchases.length > 0}/><Kpi icon={WalletCards} label="Cajas abiertas" value={openCash.length}/></div>
    <div className="dashboard-grid">
      <section className="panel"><PanelTitle title="Pagos pendientes" subtitle="Comprobantes con saldo por cobrar"/>{data.invoices.filter((item) => item.balance > 0).slice(0, 5).map((item) => <div className="finance-row" key={item.id}><span><strong>{item.number}</strong><small>{clientMap.get(item.clientId)?.name}</small></span><span><small>Saldo</small><b>{money(item.balance)}</b></span><Status value={item.paymentStatus}/></div>)}</section>
      <section className="panel"><PanelTitle title="Prioridad de reposición" subtitle="Productos en o bajo el mínimo"/>{low.length ? low.slice(0, 5).map((product) => <div className="alert-row" key={product.id}><span><strong>{product.name}</strong><small>{product.code} · {product.brand}</small></span><b>{total(product)} / mín. {product.minStock}</b></div>) : <div className="healthy">Inventario sobre mínimos.</div>}</section>
    </div>
    <div className="dashboard-grid operations-row"><section className="panel operation-photo"><img src="/ingenacc-warehouse.webp" alt="Almacén organizado de equipos y control por código de barras"/><div><h2>Inventario con trazabilidad</h2><p>Cada entrada, salida, recepción, traslado, venta y devolución genera su registro de Kardex.</p></div></section><section className="panel"><PanelTitle title="Operación de hoy" subtitle="Estado de los flujos principales"/><div className="operation-checks"><span><ShieldCheck/><b>Acceso por roles</b><small>Activo</small></span><span><Truck/><b>Proveedores y compras</b><small>{pendingPurchases.length} pendientes</small></span><span><WalletCards/><b>Control de caja</b><small>{openCash.length} abiertas</small></span><span><RotateCcw/><b>Devoluciones</b><small>{data.returns.length} registradas</small></span></div></section></div>
    <section className="panel movements-panel"><PanelTitle title="Últimos movimientos" subtitle="Trazabilidad conectada con ventas, compras e inventario"/><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Saldo</th><th>Documento</th><th>Responsable</th></tr></thead><tbody>{data.movements.slice(0, 7).map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td><TypeBadge type={item.type}/></td><td><strong>{productMap.get(item.productId)?.name}</strong><small>{productMap.get(item.productId)?.code}</small></td><td className={item.type === "SALIDA" ? "negative" : "positive"}>{item.type === "SALIDA" ? "−" : "+"}{item.quantity}</td><td>{item.balanceAfter ?? "—"}</td><td>{item.document}</td><td>{item.responsible}</td></tr>)}</tbody></table></div></section>
  </>;
}

function Kpi({ icon:Icon, label, value, danger = false }:{ icon:LucideIcon; label:string; value:string|number; danger?:boolean }) { return <article className="kpi"><span className={danger ? "danger" : ""}><Icon/></span><div><small>{label}</small><strong>{value}</strong></div></article>; }
function PanelTitle({ title, subtitle, action }:{ title:string; subtitle:string; action?:ReactNode }) { return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }
function TypeBadge({ type }:{ type:string }) { return <span className={`type type-${type.toLowerCase()}`}>{type}</span>; }
function Status({ value }:{ value:string }) { const style = ["PAGADO","RECIBIDA","ACTIVO","CERRADA"].includes(value) ? "ok" : ["PENDIENTE","ANULADO"].includes(value) ? "low" : "pending"; return <span className={`status ${style}`}>{value}</span>; }

function Products({ data, search, onReload }:{ data:Bootstrap; search:string;onReload:()=>void }) {
  const [sector, setSector] = useState("Todos");
  const list = data.products.filter((product) => (sector === "Todos" || product.sector === sector) && matches(search, [product.name, product.code, product.barcode, product.brand, product.model, product.manufacturerCode]));
  return <section className="panel">{["JEFE","GERENTE"].includes(getSession()!.user.role)?<PricingPanel data={data} onReload={onReload}/>:null}<div className="toolbar"><div className="filter-row">{["Todos", ...new Set(data.products.map((item) => item.sector))].map((item) => <button className={sector === item ? "active" : ""} onClick={() => setSector(item)} key={item}>{item}</button>)}</div><span>{list.length} productos</span></div><div className="table-wrap"><table><thead><tr><th>Código / barras</th><th>Producto</th><th>Marca / modelo</th><th>Sector</th>{["JEFE","GERENTE"].includes(getSession()!.user.role)?<th>Costo</th>:null}<th>Venta</th><th>Stock</th><th>Estado</th></tr></thead><tbody>{list.map((product) => <tr key={product.id}><td><code>{product.code}</code><small>{product.barcode}</small></td><td><strong>{product.name}</strong><small>{product.category} · {product.subcategory}</small></td><td>{product.brand}<small>{product.model}</small></td><td>{product.sector}</td>{["JEFE","GERENTE"].includes(getSession()!.user.role)?<td>{money(product.costPrice || 0)}</td>:null}<td><strong>{money(product.price)}</strong></td><td><b>{total(product)}</b></td><td><span className={total(product) <= product.minStock ? "status low" : "status ok"}>{total(product) <= product.minStock ? "REPONER" : "DISPONIBLE"}</span></td></tr>)}</tbody></table>{!list.length ? <Empty/> : null}</div></section>;
}

function Inventory({ data, search }:{ data:Bootstrap; search:string }) {
  const [locationId, setLocationId] = useState("");
  const locations = data.locations.filter((item) => !locationId || item.id === locationId);
  const filtered = data.products.filter((product) => matches(search, [product.name, product.code, product.barcode]));
  const units = (product:Product) => locations.reduce((sum, item) => sum + (product.stock[item.id] || 0), 0);
  return <section className="panel">
    <div className="report-filters"><label>Sede de inventario<select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Todas las ubicaciones</option>{data.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <div className="inventory-summary"><span><strong>{filtered.length}</strong> SKU encontrados</span><span><strong>{filtered.reduce((sum, product) => sum + units(product), 0)}</strong> unidades en la selección</span><span><strong>{locations.length}</strong> ubicaciones seleccionadas</span></div>
    <div className="table-wrap"><table><thead><tr><th>Producto</th>{locations.map((item) => <th key={item.id}>{item.name}</th>)}<th>Total seleccionado</th><th>Mínimo global</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.code} · {product.barcode}</small></td>{locations.map((item) => <td key={item.id}>{product.stock[item.id] || 0}</td>)}<td><b>{units(product)}</b></td><td>{product.minStock}</td></tr>)}</tbody></table>{!filtered.length ? <Empty/> : null}</div></section>;
}

function Movements({ data, search }:{ data:Bootstrap; search:string }) {
  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const productMap = new Map(data.products.map((item) => [item.id, item]));
  const locationMap = new Map(data.locations.map((item) => [item.id, item.name]));
  const localDay = (date:string) => new Intl.DateTimeFormat("en-CA", {timeZone:"America/Lima", year:"numeric", month:"2-digit", day:"2-digit"}).format(new Date(date));
  const invalidRange = Boolean(from && to && from > to);
  const list = invalidRange ? [] : data.movements.filter((item) =>
    (!locationId || item.from === locationId || item.to === locationId) && (!productId || item.productId === productId) &&
    (!type || item.type === type) && (!from || localDay(item.date) >= from) && (!to || localDay(item.date) <= to) &&
    matches(search, [item.type, item.reason, item.responsible, item.document, productMap.get(item.productId)?.name, productMap.get(item.productId)?.code]));
  return <section className="panel">
    <div className="report-filters">
      <label>Ubicación<select value={locationId} onChange={(e) => setLocationId(e.target.value)}><option value="">Todas</option>{data.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Producto<select value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Todos</option>{data.products.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
      <label>Tipo<select value={type} onChange={(e) => setType(e.target.value)}><option value="">Todos</option>{["ENTRADA","SALIDA","TRASLADO","AJUSTE"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Desde<input type="date" value={from} onChange={(e) => setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}/></label>
      <button className="button ghost" onClick={() => {setLocationId("");setProductId("");setType("");setFrom("");setTo("");}}>Limpiar filtros</button>
    </div>
    {invalidRange ? <p className="form-error" role="alert">La fecha final debe ser igual o posterior a la inicial.</p> : <p className="filter-result" aria-live="polite">{list.length} movimientos · fechas de Perú</p>}
    <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cant.</th><th>Origen</th><th>Destino</th><th>Saldo</th><th>Motivo</th><th>Responsable</th><th>Documento</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td><TypeBadge type={item.type}/></td><td>{productMap.get(item.productId)?.name}</td><td>{item.quantity}</td><td>{item.from ? locationMap.get(item.from) : "—"}</td><td>{item.to ? locationMap.get(item.to) : "—"}</td><td>{item.balanceAfter ?? "—"}</td><td>{item.reason}</td><td>{item.responsible}</td><td>{item.document}</td></tr>)}</tbody></table>{!list.length ? <Empty/> : null}</div></section>;
}

function PhysicalCounts({data,onReload}:{data:Bootstrap;onReload:()=>void}) {
  const [error,setError] = useState(""); const [saving,setSaving] = useState(false);
  const user = getSession()!.user;
  const canReview = ["JEFE","GERENTE"].includes(user.role);
  const submit = async (event:React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; setSaving(true);setError("");
    try {await api.physicalCount(Object.fromEntries(new FormData(form)));form.reset();onReload();}
    catch(reason) {setError(reason instanceof Error ? reason.message : "No se pudo guardar");} finally {setSaving(false);}
  };
  const review = async (id:string,approve:boolean) => {setSaving(true);setError("");try {await api.reviewCount(id,approve);onReload();} catch(reason) {setError(reason instanceof Error ? reason.message : "No se pudo revisar");}finally {setSaving(false);}};
  return <><section className="panel count-form"><PanelTitle title="Registrar conteo físico" subtitle="El registro no cambia el stock. Otra persona de gerencia o jefatura debe autorizar el ajuste."/>
    <form className="form-grid" onSubmit={submit}><label>Producto contado<select name="productId" required><option value="">Selecciona</option>{data.products.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label><label>Ubicación contada<select name="locationId" required><option value="">Selecciona</option>{data.locations.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Unidades físicas<input name="counted" type="number" min="0" step="1" required/></label><label>Motivo del conteo<input name="reason" minLength={5} maxLength={300} required placeholder="Conteo de cierre, verificación de diferencia…"/></label><div className="form-actions full"><button className="button primary" disabled={saving}>Enviar a revisión</button></div></form>
    {error ? <p className="form-error" role="alert">{error}</p> : null}</section>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Producto / ubicación</th><th>Registrado</th><th>Contado</th><th>Diferencia</th><th>Motivo</th><th>Estado</th><th>Revisión</th></tr></thead><tbody>{data.physicalCounts.map(item=><tr key={item.id}><td>{formatDate(item.createdAt)}</td><td>{data.products.find(p=>p.id===item.productId)?.name}<small>{data.locations.find(l=>l.id===item.locationId)?.name}</small></td><td>{item.expected}</td><td>{item.counted}</td><td className={item.counted!==item.expected ? "negative" : "positive"}>{item.counted-item.expected}</td><td>{item.reason}</td><td><Status value={item.status}/></td><td>{item.status==="PENDIENTE" && canReview ? <><button className="table-action" disabled={saving || item.createdBy===user.id} onClick={()=>review(item.id,true)}>Aprobar ajuste</button><button className="table-action" disabled={saving} onClick={()=>review(item.id,false)}>Rechazar</button>{item.createdBy===user.id ? <small>Requiere otro autorizador</small> : null}</> : item.reviewedAt ? formatDate(item.reviewedAt) : "Por autorizar"}</td></tr>)}</tbody></table>{!data.physicalCounts.length ? <Empty/> : null}</div></section>
  </>;
}

function Transfers({ data, search }:{ data:Bootstrap; search:string }) {
  const productMap = new Map(data.products.map((item) => [item.id, item])); const locationMap = new Map(data.locations.map((item) => [item.id, item.name]));
  const list = data.transfers.filter((item) => matches(search, [item.number, item.reason, item.responsible, productMap.get(item.productId)?.name]));
  return <section className="panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Número</th><th>Producto</th><th>Cant.</th><th>Origen</th><th>Destino</th><th>Motivo</th><th>Responsable</th><th>Estado</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td><strong>{item.number}</strong></td><td>{productMap.get(item.productId)?.name}</td><td>{item.quantity}</td><td>{locationMap.get(item.from)}</td><td>{locationMap.get(item.to)}</td><td>{item.reason}</td><td>{item.responsible}</td><td><Status value={item.status}/></td></tr>)}</tbody></table>{!list.length ? <Empty/> : null}</div></section>;
}

function Suppliers({ data, search }:{ data:Bootstrap; search:string }) {
  const list = data.suppliers.filter((item) => matches(search, [item.name, item.documentNumber, item.contact, item.phone, item.email]));
  return <section className="panel"><div className="table-wrap"><table><thead><tr><th>Documento</th><th>Proveedor</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th>Dirección</th><th>Estado</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td><strong>{item.documentType}</strong><small>{item.documentNumber}</small></td><td><strong>{item.name}</strong></td><td>{item.contact || "—"}</td><td>{item.phone || "—"}</td><td>{item.email || "—"}</td><td>{item.address || "—"}</td><td><Status value={item.active ? "ACTIVO" : "INACTIVO"}/></td></tr>)}</tbody></table>{!list.length ? <Empty/> : null}</div></section>;
}

function Purchases({ data, search, onReload }:{ data:Bootstrap; search:string; onReload:()=>void }) {
  const [selected, setSelected] = useState<Bootstrap["purchases"][number]|null>(null);
  const [quantities, setQuantities] = useState<number[]>([]);
  const [requestId, setRequestId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supplierMap = new Map(data.suppliers.map((item) => [item.id, item]));
  const productMap = new Map(data.products.map((item) => [item.id, item.name]));
  const locationMap = new Map(data.locations.map((item) => [item.id, item.name]));
  const list = data.purchases.filter((item) => matches(search, [item.number, item.reference, item.createdBy, supplierMap.get(item.supplierId)?.name]));
  const receive = async (event:React.FormEvent) => {
    event.preventDefault(); if (!selected || saving) return; setSaving(true);setError("");
    try {
      const items = quantities.map((quantity, line) => ({line, quantity})).filter((item) => item.quantity > 0);
      if (!items.length) throw new Error("Indica al menos una unidad recibida.");
      await api.receivePurchase(selected.id, requestId, items); setSelected(null); onReload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo recibir la compra"); }
    finally { setSaving(false); }
  };
  return <><div className="purchase-summary"><span><PackageCheck/><b>{list.filter((item) => item.status === "PENDIENTE").length}</b><small>órdenes con unidades pendientes</small></span><span><Truck/><b>{money(list.reduce((sum, item) => sum + item.total, 0))}</b><small>valor registrado en compras</small></span></div>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Orden</th><th>Proveedor</th><th>Destino</th><th>Recibido / pedido</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{list.map((item) => {
      const received = item.items.reduce((sum, line) => sum + line.receivedQuantity, 0);
      return <tr key={item.id}><td>{formatDate(item.date)}</td><td><strong>{item.number}</strong><small>{item.reference || "Sin referencia"}</small></td><td>{supplierMap.get(item.supplierId)?.name}</td><td>{locationMap.get(item.locationId)}</td><td>{received} / {item.items.reduce((sum, line) => sum + line.quantity, 0)} unidades</td><td><strong>{item.total==null?"Restringido":money(item.total)}</strong></td><td><Status value={item.status === "PENDIENTE" && received > 0 ? "PARCIAL" : item.status}/></td><td>{item.status === "PENDIENTE" ? <button className="table-action" onClick={() => {setSelected(item);setQuantities(item.items.map(() => 0));setRequestId(newRequestId());setError("");}}>Registrar recepción</button> : <small>{item.receivedBy}<br/>{item.receivedAt ? formatDate(item.receivedAt) : ""}</small>}</td></tr>;
    })}</tbody></table>{!list.length ? <Empty/> : null}</div></section>
    {selected ? <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title"><h2 id="receipt-title">Recibir {selected.number}</h2><p>Registra únicamente lo recibido físicamente. El resto quedará pendiente.</p><form onSubmit={receive} className="form-grid">
      {selected.items.map((line, index) => <label className="full" key={index}>{productMap.get(line.productId)} · pendiente {line.quantity - line.receivedQuantity}<input aria-label={`Cantidad recibida ${index + 1}`} type="number" min="0" max={line.quantity - line.receivedQuantity} step="1" required disabled={saving || line.quantity === line.receivedQuantity} value={quantities[index]} onChange={(event) => {setQuantities((values) => values.map((value, i) => i === index ? Number(event.target.value) : value));setRequestId(newRequestId());}}/></label>)}
      {error ? <p className="form-error full" role="alert">{error}</p> : null}<div className="form-actions full"><button type="button" className="button ghost" disabled={saving} onClick={() => setSelected(null)}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : "Confirmar cantidades"}</button></div>
    </form></div></div> : null}
  </>;
}

function Clients({ data, search }:{ data:Bootstrap; search:string }) {
  const list = data.clients.filter((item) => matches(search, [item.name, item.documentNumber, item.phone, item.email]));
  return <section className="panel"><div className="table-wrap"><table><thead><tr><th>Documento</th><th>Cliente / razón social</th><th>Teléfono</th><th>Correo</th><th>Dirección</th><th>Ventas</th><th>Total comprado</th><th>Estado</th></tr></thead><tbody>{list.map((item) => { const invoices = data.invoices.filter((invoice) => invoice.clientId === item.id); return <tr key={item.id}><td><strong>{item.documentType}</strong><small>{item.documentNumber}</small></td><td><strong>{item.name}</strong></td><td>{item.phone}</td><td>{item.email || "—"}</td><td>{item.address || "—"}</td><td>{invoices.length}</td><td>{money(invoices.reduce((sum, invoice) => sum + invoice.total, 0))}</td><td><Status value={item.active ? "ACTIVO" : "INACTIVO"}/></td></tr>; })}</tbody></table>{!list.length ? <Empty/> : null}</div></section>;
}

function Sales({ data, search }:{ data:Bootstrap; search:string }) {
  const clientMap = new Map(data.clients.map((item) => [item.id, item])); const list = data.invoices.filter((item) => matches(search, [item.number, item.documentType, clientMap.get(item.clientId)?.name, item.seller]));
  return <section className="panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Entrega</th><th>Estado</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td><strong>{item.number}</strong><small>{item.documentType}</small></td><td>{clientMap.get(item.clientId)?.name}</td><td>{item.seller}</td><td><strong>{item.total==null?"Restringido":money(item.total)}</strong></td><td>{money(item.paid)}</td><td>{money(item.balance)}</td><td><Status value={item.deliveryStatus || "ENTREGADO"}/></td><td><Status value={item.paymentStatus}/></td></tr>)}</tbody></table>{!list.length ? <Empty/> : null}</div></section>;
}

function Billing({ data, search }:{ data:Bootstrap; search:string }) { return <><div className="billing-warning"><FileWarning/><div><strong>Facturación electrónica SUNAT pendiente</strong><span>{data.company.billingNotice}</span></div></div><Sales data={data} search={search}/></>; }

function Payments({ data, search }:{ data:Bootstrap; search:string }) {
  const invoiceMap = new Map(data.invoices.map((item) => [item.id, item])); const list = data.payments.filter((item) => matches(search, [item.method, item.reference, item.receivedBy, invoiceMap.get(item.invoiceId)?.number]));
  return <><div className="cash-strip"><CircleDollarSign/><span><small>Ingresos registrados</small><strong>{money(list.reduce((sum, item) => sum + item.amount, 0))}</strong></span><span><small>Operaciones</small><strong>{list.length}</strong></span><span><small>Saldos por cobrar</small><strong>{money(data.invoices.reduce((sum, item) => sum + item.balance, 0))}</strong></span></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Comprobante</th><th>Medio</th><th>Referencia</th><th>Recibido por</th><th>Monto</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td>{invoiceMap.get(item.invoiceId)?.number}</td><td><span className="status pending">{item.method.replace("_", " / ")}</span></td><td>{item.reference}</td><td>{item.receivedBy}</td><td><strong>{money(item.amount)}</strong></td></tr>)}</tbody></table></div></section></>;
}

function Cash({ data, onOpen, onMovement, onClose }:{ data:Bootstrap; onOpen:()=>void; onMovement:()=>void; onClose:()=>void }) {
  const locationMap = new Map(data.locations.map((item) => [item.id, item.name])); const open = data.cashSessions.filter((item) => item.status === "ABIERTA");
  const expected = (id:string, opening:number) => opening + data.cashMovements.filter((item) => item.cashSessionId === id && item.method === "EFECTIVO").reduce((sum, item) => sum + (item.type === "INGRESO" ? item.amount : -item.amount), 0);
  return <><div className="cash-actions"><button className="button secondary" onClick={onOpen}><Plus/>Abrir otra caja</button><button className="button outline-dark" onClick={onMovement} disabled={!open.length}>Ingreso / egreso</button><button className="button danger-button" onClick={onClose} disabled={!open.length}>Cerrar caja</button></div><div className="cash-session-grid">{data.cashSessions.map((session) => <article className={`cash-session ${session.status === "ABIERTA" ? "is-open" : ""}`} key={session.id}><header><span><WalletCards/><b>{session.number}</b></span><Status value={session.status}/></header><h2>{locationMap.get(session.locationId)}</h2><p>Responsable: {session.openedBy}</p><div><span><small>Apertura</small><b>{money(session.openingAmount)}</b></span><span><small>{session.status === "ABIERTA" ? "Efectivo esperado" : "Contado"}</small><b>{money(session.status === "ABIERTA" ? expected(session.id, session.openingAmount) : session.countedAmount || 0)}</b></span><span><small>Diferencia</small><b className={(session.difference || 0) !== 0 ? "negative" : "positive"}>{session.difference === null ? "—" : money(session.difference)}</b></span></div><footer>Abierta {formatDate(session.openedAt)}{session.closedAt ? ` · Cerrada ${formatDate(session.closedAt)}` : ""}</footer></article>)}</div><section className="panel"><PanelTitle title="Movimientos de caja" subtitle="Ventas, pagos e ingresos o egresos autorizados"/><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Caja</th><th>Tipo</th><th>Concepto</th><th>Medio</th><th>Responsable</th><th>Monto</th></tr></thead><tbody>{data.cashMovements.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td>{data.cashSessions.find((session) => session.id === item.cashSessionId)?.number}</td><td><TypeBadge type={item.type}/></td><td>{item.concept}<small>{item.reference}</small></td><td>{item.method.replace("_", " / ")}</td><td>{item.responsible}</td><td className={item.type === "EGRESO" ? "negative" : "positive"}>{item.type === "EGRESO" ? "−" : "+"}{money(item.amount)}</td></tr>)}</tbody></table></div></section></>;
}

function Returns({ data, search }:{ data:Bootstrap; search:string }) {
  const invoiceMap = new Map(data.invoices.map((item) => [item.id, item])); const productMap = new Map(data.products.map((item) => [item.id, item]));
  const list = data.returns.filter((item) => matches(search, [item.number, item.reason, item.responsible, invoiceMap.get(item.invoiceId)?.number, productMap.get(item.productId)?.name]));
  return <><div className="returns-note"><RotateCcw/><span><strong>Reversión trazable</strong><small>La venta original no se elimina; la devolución genera su propio documento y movimiento de Kardex.</small></span></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Devolución</th><th>Venta original</th><th>Producto</th><th>Cant.</th><th>Motivo</th><th>Retorna a stock</th><th>Importe</th><th>Responsable</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td><strong>{item.number}</strong></td><td>{invoiceMap.get(item.invoiceId)?.number}</td><td>{productMap.get(item.productId)?.name}</td><td>{item.quantity}</td><td>{item.reason}</td><td><Status value={item.returnToStock ? "SÍ" : "NO"}/></td><td>{money(item.amount)}</td><td>{item.responsible}</td></tr>)}</tbody></table>{!list.length ? <Empty/> : null}</div></section></>;
}

function Locations({ data }:{ data:Bootstrap }) { return <div className="location-grid">{data.locations.map((item) => <article className={`location-card ${item.name.includes("Honda") ? "honda-location" : ""}`} key={item.id}><MapPin/><div><h2>{item.name}</h2><p>{item.detail}</p><strong>{data.products.reduce((sum, product) => sum + (product.stock[item.id] || 0), 0)} unidades registradas</strong><small>{item.kind} · {item.active ? "ACTIVA" : "INACTIVA"}</small></div></article>)}</div>; }

function Reports({ data }:{ data:Bootstrap }) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const inRange = (date:string) => (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to);
  const movements = data.movements.filter((item) => inRange(item.date)); const invoices = data.invoices.filter((item) => inRange(item.date)); const purchases = data.purchases.filter((item) => inRange(item.date));
  const entries = movements.filter((item) => item.type === "ENTRADA").reduce((sum, item) => sum + item.quantity, 0); const outputs = movements.filter((item) => item.type === "SALIDA").reduce((sum, item) => sum + item.quantity, 0);
  const margin = invoices.reduce((sum, invoice) => sum + invoice.items.reduce((lineSum, line) => { const product = data.products.find((item) => item.id === line.productId); return lineSum + (line.unitPrice - (product?.costPrice || 0)) * line.quantity; }, 0), 0);
  const low = data.products.filter((product) => total(product) <= product.minStock);
  return <><div className="report-filters"><label>Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)}/></label><button className="button ghost" onClick={() => { setFrom(""); setTo(""); }}>Limpiar</button></div><div className="report-summary"><article><ArrowDownRight/><span><small>Unidades ingresadas</small><strong>{entries}</strong></span></article><article><ArrowUpRight/><span><small>Unidades despachadas</small><strong>{outputs}</strong></span></article><article><CircleDollarSign/><span><small>Ventas</small><strong>{money(invoices.reduce((sum, item) => sum + item.total, 0))}</strong></span></article><article><PackageCheck/><span><small>Compras</small><strong>{money(purchases.reduce((sum, item) => sum + item.total, 0))}</strong></span></article><article><CircleDollarSign/><span><small>Margen bruto estimado</small><strong>{money(margin)}</strong></span></article></div><section className="panel"><PanelTitle title="Reporte de stock crítico" subtitle="Prioriza la siguiente reposición."/>{low.map((product) => <div className="report-row" key={product.id}><span><strong>{product.name}</strong><small>{product.code} · {product.brand}</small></span><span>Actual <b>{total(product)}</b></span><span>Mínimo <b>{product.minStock}</b></span><span>Faltante <b>{Math.max(0, product.minStock - total(product))}</b></span></div>)}</section></>;
}

function Audit({ data, search }:{ data:Bootstrap; search:string }) {
  const list = data.audit.filter((item) => matches(search, [item.userName, item.action, item.entity, item.detail]));
  return <><div className="audit-banner"><ShieldCheck/><div><strong>Bitácora protegida</strong><span>Los usuarios operativos no pueden modificar ni eliminar estos registros.</span></div></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th><th>ID</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td><strong>{item.userName}</strong></td><td><span className="status pending">{item.action}</span></td><td>{item.entity}</td><td>{item.detail || "—"}</td><td><code>{item.entityId.slice(0, 12)}</code></td></tr>)}</tbody></table>{!list.length ? <Empty/> : null}</div></section></>;
}

function Users({ data }:{ data:Bootstrap }) { const locationMap = new Map(data.locations.map((item) => [item.id, item.name])); return <section className="panel"><div className="table-wrap"><table><thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Sede asignada</th><th>Estado</th></tr></thead><tbody>{data.users.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.email}</td><td><span className="status pending">{item.role}</span></td><td>{locationMap.get(item.locationId)}</td><td><Status value={item.active ? "ACTIVO" : "INACTIVO"}/></td></tr>)}</tbody></table></div></section>; }

function Configuration({ data }:{ data:Bootstrap }) {
  const [saving, setSaving] = useState<"json"|"database"|null>(null); const [message, setMessage] = useState("");
  const [automatic,setAutomatic]=useState<Awaited<ReturnType<typeof api.backupStatus>>|null>(null);const [automaticBusy,setAutomaticBusy]=useState(false);
  useEffect(()=>{api.backupStatus().then(setAutomatic).catch(()=>setAutomatic(null));},[]);
  const download = async (kind:"json"|"database") => { setSaving(kind); setMessage(""); try { if (kind === "json") await api.downloadBackup(); else await api.downloadDatabase(); setMessage(kind === "json" ? "Respaldo JSON descargado correctamente." : "Copia SQLite descargada correctamente."); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "No se pudo descargar"); } finally { setSaving(null); } };
  const createAutomatic=async()=>{setAutomaticBusy(true);setMessage("");try{const status=await api.createAutomaticBackup();setAutomatic(status);setMessage("Respaldo automático creado y verificado correctamente.");}catch(reason){setMessage(reason instanceof Error?reason.message:"No se pudo crear la copia automática.");}finally{setAutomaticBusy(false);}};
  return <div className="settings-grid"><section className="panel company-card"><PanelTitle title="Organización" subtitle="Parámetros usados en operaciones y comprobantes"/><dl><div><dt>Razón social</dt><dd>{data.company.legalName}</dd></div><div><dt>RUC</dt><dd>{data.company.ruc}</dd></div><div><dt>Dirección</dt><dd>{data.company.address}</dd></div><div><dt>IGV</dt><dd>{data.company.taxRate * 100}%</dd></div><div><dt>Moneda</dt><dd>{data.company.currency}</dd></div></dl></section><section className="panel backup-card"><DatabaseBackup/><h2>Respaldos manuales</h2><p>El JSON permite revisar o migrar datos sin contraseñas. La copia SQLite conserva toda la base, incluidos los hashes de acceso; guárdala en un lugar protegido.</p><div className="backup-actions"><button className="button primary" onClick={() => download("json")} disabled={saving !== null}><Download/>{saving === "json" ? "Preparando…" : "Respaldo JSON"}</button><button className="button secondary" onClick={() => download("database")} disabled={saving !== null}><Download/>{saving === "database" ? "Preparando…" : "Base SQLite"}</button></div>{message ? <small>{message}</small> : null}</section><section className="panel backup-card automatic-backup-card"><DatabaseBackup/><h2>Respaldo automático</h2><p>{automatic?.configured?"La carpeta externa está configurada.":"Configura BACKUP_DIR con la ruta de la carpeta compartida para proteger la copia fuera de la PC principal."}</p><dl><div><dt>Estado</dt><dd>{automatic?.enabled?"ACTIVO":"NO DISPONIBLE"}</dd></div><div><dt>Última copia</dt><dd>{automatic?.lastSuccess?formatDate(automatic.lastSuccess):"Pendiente"}</dd></div><div><dt>Archivo</dt><dd>{automatic?.lastFile||"—"}</dd></div><div><dt>Verificación</dt><dd>{automatic?.lastHash?automatic.lastHash.slice(0,12)+"…":"—"}</dd></div></dl><button className="button secondary" onClick={createAutomatic} disabled={automaticBusy}>{automaticBusy?"Verificando…":"Crear y verificar ahora"}</button>{automatic?.lastError?<small className="backup-error">{automatic.lastError}</small>:null}</section><section className="panel production-card"><DatabaseBackup/><div><h2>Base de datos operativa</h2><p><strong>{data.storage.engine}</strong> guarda la información en <code>{data.storage.file}</code>, con modo {data.storage.journalMode}, claves foráneas {data.storage.foreignKeys ? "activas" : "inactivas"}, integridad {data.storage.integrity} y esquema v{data.storage.schemaVersion} ({data.storage.migrationsApplied} migraciones). Para varias sucursales o un despliegue en Internet se recomienda un servidor central con PostgreSQL, HTTPS, respaldos automáticos y secretos privados.</p></div></section><section className="panel architecture-card"><ShieldCheck/><div><h2>Arquitectura tecnológica</h2><p><strong>React + TypeScript</strong> organiza la interfaz en componentes reutilizables y rutas protegidas. <strong>Express</strong> concentra las reglas, permisos y validaciones; <strong>SQLite</strong> conserva la operación local. Los servicios API separan la interfaz de la lógica y permiten migrar la base o el servidor sin reconstruir cada pantalla.</p><ul><li>Rutas por módulo y control por roles</li><li>Formularios y API validados</li><li>Importación Excel con validación previa</li><li>Respaldo automático con SHA-256</li></ul></div></section><section className="panel billing-warning"><FileWarning/><div><strong>SUNAT pendiente de homologación</strong><span>Se preparará el intercambio con Facturador SUNAT; todavía deben configurarse certificado, series y pruebas oficiales.</span></div></section></div>;
}

function Empty() { return <div className="empty"><SearchX/><strong>Sin resultados</strong><span>Prueba con otra búsqueda o registra información nueva.</span></div>; }
function AccessDenied() { return <section className="panel access-denied"><FileWarning/><h2>Acceso restringido</h2><p>Tu rol no tiene permisos para abrir este módulo.</p></section>; }
