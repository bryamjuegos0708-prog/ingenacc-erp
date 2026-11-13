import { Barcode, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { api, getSession } from "../api";
import type { Bootstrap } from "../types";

function Modal({ title, subtitle, onClose, children }:{ title:string; subtitle:string; onClose:()=>void; children:ReactNode }) {
  return <div className="modal-backdrop"><div className="modal modal-wide" role="dialog" aria-modal="true" aria-label={title}>
    <div className="modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X/></button></div>
    {children}
  </div></div>;
}

function Actions({ saving, onClose, label }:{ saving:boolean; onClose:()=>void; label:string }) {
  return <div className="form-actions full"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : label}</button></div>;
}

function useSubmit(onSaved:()=>void, onClose:()=>void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const run = async (action:()=>Promise<unknown>) => {
    setSaving(true); setError("");
    try { await action(); onSaved(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar"); }
    finally { setSaving(false); }
  };
  return { saving, error, run };
}

export function ProductModal({ data, onClose, onSaved }:{ data:Bootstrap; onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const submit = (event:FormEvent<HTMLFormElement>) => { event.preventDefault(); submitter.run(() => api.product(Object.fromEntries(new FormData(event.currentTarget)))); };
  return <Modal title="Registrar producto" subtitle="Completa lo esencial. El sistema genera el SKU y código si los dejas vacíos." onClose={onClose}>
    <form className="form-grid product-quick-form" onSubmit={submit}>
      <label className="full">Nombre del producto<input name="name" required autoFocus placeholder="Ej. Motobomba Honda WB30XT"/></label>
      <label>Marca<input name="brand" list="brand-options" required defaultValue={data.brands[0]?.name || "Honda"}/><datalist id="brand-options">{data.brands.map((brand) => <option value={brand.name} key={brand.id}/>)}</datalist></label>
      <label>Modelo<input name="model" required placeholder="Modelo comercial"/></label>
      <label>Categoría<input name="category" required placeholder="Motores, motobombas, repuestos…"/></label>
      <label>Sector<select name="sector"><option>Multipropósito</option><option>Construcción</option><option>Agricultura</option><option>Minería</option><option>Repuestos</option></select></label>
      <label>Costo unitario<input name="costPrice" type="number" min="0" step="0.01" required/></label>
      <label>Precio de venta<input name="price" type="number" min="0.01" step="0.01" required/></label>
      <label>Stock inicial<input name="initialStock" type="number" min="0" defaultValue="0" required/></label>
      <label>Ubicación inicial<select name="locationId">{data.locations.filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Stock mínimo<input name="minStock" type="number" min="0" defaultValue="1" required/></label>
      <label>Unidad<select name="unit" defaultValue="UND"><option>UND</option><option>JGO</option><option>MTR</option><option>GLN</option><option>LT</option></select></label>
      <details className="advanced-fields full"><summary>Datos adicionales y códigos</summary><div className="form-grid form-grid-3">
        <label>Código interno<input name="code" placeholder="Se genera automáticamente"/></label><label>Código de barras<input name="barcode" placeholder="Escanea o deja vacío"/></label><label>Código fabricante<input name="manufacturerCode" defaultValue="Por validar"/></label>
        <label className="full">Descripción<input name="description" placeholder="Uso o característica principal"/></label><label>Subcategoría<input name="subcategory" defaultValue="Por validar"/></label><label>Potencia / capacidad<input name="power" defaultValue="Por validar"/></label><label>Combustible<input name="fuel" defaultValue="Por validar"/></label><label>Origen<input name="origin" defaultValue="Por validar"/></label><label>Garantía<input name="warranty" defaultValue="Por validar"/></label>
      </div></details>
      {submitter.error ? <p className="form-error full">{submitter.error}</p> : null}
      <Actions saving={submitter.saving} onClose={onClose} label="Registrar producto"/>
    </form>
  </Modal>;
}

export function ClientModal({ onClose, onSaved }:{ onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const submit = (event:FormEvent<HTMLFormElement>) => { event.preventDefault(); submitter.run(() => api.client(Object.fromEntries(new FormData(event.currentTarget)))); };
  return <Modal title="Registrar cliente" subtitle="Los datos se usarán en cotizaciones, ventas y comprobantes." onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <label>Tipo de documento<select name="documentType"><option>DNI</option><option>RUC</option><option>CE</option></select></label>
      <label>Número de documento<input name="documentNumber" required/></label>
      <label className="full">Nombre o razón social<input name="name" required/></label>
      <label>Teléfono<input name="phone" required/></label><label>Correo<input name="email" type="email"/></label>
      <label className="full">Dirección<input name="address"/></label>
      {submitter.error ? <p className="form-error full">{submitter.error}</p> : null}
      <Actions saving={submitter.saving} onClose={onClose} label="Guardar cliente"/>
    </form>
  </Modal>;
}

export function SupplierModal({ onClose, onSaved }:{ onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const submit = (event:FormEvent<HTMLFormElement>) => { event.preventDefault(); submitter.run(() => api.supplier(Object.fromEntries(new FormData(event.currentTarget)))); };
  return <Modal title="Registrar proveedor" subtitle="Centraliza los datos usados en órdenes y recepción de mercadería." onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <label>Tipo de documento<select name="documentType"><option>RUC</option><option>DNI</option><option>OTRO</option></select></label>
      <label>Número de documento<input name="documentNumber" required/></label>
      <label className="full">Razón social<input name="name" required/></label>
      <label>Persona de contacto<input name="contact"/></label><label>Teléfono<input name="phone"/></label>
      <label>Correo<input name="email" type="email"/></label><label>Dirección<input name="address"/></label>
      {submitter.error ? <p className="form-error full">{submitter.error}</p> : null}
      <Actions saving={submitter.saving} onClose={onClose} label="Guardar proveedor"/>
    </form>
  </Modal>;
}

export function SaleModal({ data, onClose, onSaved }:{ data:Bootstrap; onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const stores = data.locations.filter((item) => item.kind === "TIENDA" && item.active);
  const [locationId, setLocationId] = useState(stores[0]?.id || "");
  const [cart, setCart] = useState<Array<{productId:string; quantity:number}>>([]);
  const [selected, setSelected] = useState(data.products[0]?.id || "");
  const [query, setQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.products.filter((product) => product.active && (!normalized || [product.name, product.code, product.barcode, product.brand, product.model, product.category].join(" ").toLowerCase().includes(normalized))).slice(0, 20);
  }, [data.products, query]);
  const add = (productId = selected) => {
    if (!productId) return;
    setCart((items) => {
      const found = items.find((item) => item.productId === productId);
      return found ? items.map((item) => item.productId === productId ? { ...item, quantity:item.quantity + 1 } : item) : [...items, { productId, quantity:1 }];
    });
  };
  const scan = (event:KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const exact = data.products.find((product) => [product.barcode, product.code].some((value) => value.toLowerCase() === query.trim().toLowerCase()));
    if (exact) { add(exact.id); setSelected(exact.id); setQuery(""); }
  };
  const change = (id:string, delta:number) => setCart((items) => items.map((item) => item.productId === id ? { ...item, quantity:Math.max(1, item.quantity + delta) } : item));
  const remove = (id:string) => setCart((items) => items.filter((item) => item.productId !== id));
  const gross = useMemo(() => cart.reduce((sum, item) => sum + (data.products.find((product) => product.id === item.productId)?.price || 0) * item.quantity, 0), [cart, data.products]);
  const [discount,setDiscount]=useState(0);
  const total=Math.max(0,Math.round((gross-discount)*100)/100);
  const openCash = data.cashSessions.find((session) => session.locationId === locationId && session.status === "ABIERTA");
  const submit = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length) return;
    submitter.run(() => {
      const raw = Object.fromEntries(new FormData(event.currentTarget));
      return api.sale({ ...raw, locationId, cashSessionId:openCash?.id, items:cart,discountAmount:discount });
    });
  };
  return <Modal title="Nueva venta / POS" subtitle="Busca o escanea productos, valida stock y genera el comprobante interno." onClose={onClose}>
    <form onSubmit={submit} className="sale-form">
      <div className="sale-customer form-grid form-grid-3">
        <label>Cliente<select name="clientId">{data.clients.filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.documentNumber} · {item.name}</option>)}</select></label>
        <label>Comprobante<select name="documentType"><option>BOLETA</option><option>FACTURA</option><option>NOTA_VENTA</option></select></label>
        <label>Punto de venta<select value={locationId} onChange={(event) => setLocationId(event.target.value)}>{stores.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      </div>
      <div className={`cash-availability ${openCash ? "ready" : "blocked"}`}><span>{openCash ? `Caja abierta: ${openCash.number || "Sede seleccionada"}` : "Sin caja abierta en esta tienda"}</span><small>{openCash ? "Los pagos quedarán conciliados automáticamente." : "Solicita apertura de caja antes de cobrar."}</small></div>
      <div className="cart-builder">
        <div className="barcode-search"><Barcode/><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={scan} placeholder="Escanea código de barras o busca por nombre, código, marca…"/></div>
        <div className="quick-actions" aria-label="Filtrar catálogo">{["","Motor","Repuesto","Honda","Makita"].map(term=><button type="button" className="button secondary" key={term} aria-pressed={query===term} onClick={()=>setQuery(term)}>{term||"Todos"}</button>)}</div>
        <div className="product-picker">{options.map(product=><button type="button" className="product-choice" key={product.id} onClick={()=>add(product.id)}><strong>{product.name}</strong><span>{product.model} · {product.code}</span><span>Disponible: {product.availableStock?.[locationId] ?? product.stock[locationId] ?? 0} · S/ {product.price.toFixed(2)}</span><b>+ Agregar a la venta</b></button>)}</div>
        {!options.length&&<p role="status">No hay coincidencias. Prueba otro nombre o código, o pulsa Todos.</p>}
        <div className="cart-lines">{cart.length ? cart.map((item) => { const product = data.products.find((candidate) => candidate.id === item.productId)!; return <div key={item.productId}><span><strong>{product.name}</strong><small>{product.code} · Disponible {product.availableStock?.[locationId] ?? product.stock[locationId] ?? 0}</small></span><span className="qty"><button type="button" onClick={() => change(product.id, -1)}><Minus/></button><b>{item.quantity}</b><button type="button" onClick={() => change(product.id, 1)}><Plus/></button></span><strong>S/ {(product.price * item.quantity).toFixed(2)}</strong><button type="button" className="line-remove" onClick={() => remove(product.id)} aria-label={`Quitar ${product.name}`}><X/></button></div>; }) : <div className="empty-cart"><ShoppingCart/>Agrega productos a la venta.</div>}</div>
        <div className="cart-total"><span>Total incluido IGV</span><strong>S/ {total.toFixed(2)}</strong></div>
      </div>
      <p>Sin crédito: un adelanto reserva stock. La entrega completa se registra al completar el pago.</p>
      {["JEFE","GERENTE"].includes(getSession()!.user.role)?<label>Descuento autorizado (S/)<input type="number" min="0" max={gross} step="0.01" value={discount} onChange={e=>setDiscount(Number(e.target.value))}/></label>:null}
      <div className="form-grid form-grid-3"><label>Adelanto o pago completo<input name="initialPayment" type="number" min="0.01" max={total} step="0.01" required/></label><label>Medio de pago<select name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>EFECTIVO</option><option>TARJETA</option><option>TRANSFERENCIA</option><option>YAPE_PLIN</option></select></label><label>Referencia<input name="reference" defaultValue="Venta mostrador"/></label>
        {submitter.error ? <p className="form-error full">{submitter.error}</p> : null}<Actions saving={submitter.saving} onClose={onClose} label="Confirmar venta"/>
      </div>
    </form>
  </Modal>;
}

export function PurchaseModal({ data, onClose, onSaved }:{ data:Bootstrap; onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const [selected, setSelected] = useState(data.products[0]?.id || "");
  const [items, setItems] = useState<Array<{productId:string; quantity:number; unitCost:number}>>([]);
  const add = () => {
    if (!selected) return;
    const product = data.products.find((item) => item.id === selected)!;
    setItems((current) => current.some((item) => item.productId === selected) ? current : [...current, { productId:selected, quantity:1, unitCost:product.costPrice || 0 }]);
  };
  const update = (id:string, field:"quantity"|"unitCost", value:number) => setItems((current) => current.map((item) => item.productId === id ? { ...item, [field]:Math.max(field === "quantity" ? 1 : 0.01, value) } : item));
  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0), [items]);
  const submit = (event:FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!items.length) return; submitter.run(() => api.purchase({ ...Object.fromEntries(new FormData(event.currentTarget)), items })); };
  return <Modal title="Nueva orden de compra" subtitle="La orden no modifica stock hasta que almacén confirme su recepción." onClose={onClose}>
    <form onSubmit={submit} className="sale-form">
      <div className="form-grid"><label>Proveedor<select name="supplierId">{data.suppliers.filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.documentNumber} · {item.name}</option>)}</select></label><label>Almacén de recepción<select name="locationId">{data.locations.filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
      <div className="cart-builder"><div className="cart-add"><select value={selected} onChange={(event) => setSelected(event.target.value)}>{data.products.filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select><button type="button" className="button secondary" onClick={add}><Plus/>Agregar</button></div><div className="purchase-lines">{items.length ? items.map((item) => { const product = data.products.find((candidate) => candidate.id === item.productId)!; return <div key={item.productId}><span><strong>{product.name}</strong><small>{product.code}</small></span><label>Cant.<input type="number" min="1" value={item.quantity} onChange={(event) => update(item.productId, "quantity", Number(event.target.value))}/></label><label>Costo unit.<input type="number" min="0.01" step="0.01" value={item.unitCost} onChange={(event) => update(item.productId, "unitCost", Number(event.target.value))}/></label><strong>S/ {(item.quantity * item.unitCost).toFixed(2)}</strong><button type="button" className="line-remove" onClick={() => setItems((current) => current.filter((line) => line.productId !== item.productId))}><X/></button></div>; }) : <div className="empty-cart">Agrega los productos de la orden.</div>}</div><div className="cart-total"><span>Total referencial incluido IGV</span><strong>S/ {total.toFixed(2)}</strong></div></div>
      <div className="form-grid"><label>Referencia<input name="reference" placeholder="Cotización o documento del proveedor"/></label><label>Observaciones<input name="notes" placeholder="Condición de entrega o validación"/></label>{submitter.error ? <p className="form-error full">{submitter.error}</p> : null}<Actions saving={submitter.saving} onClose={onClose} label="Crear orden"/></div>
    </form>
  </Modal>;
}

export function TransferModal({ data, onClose, onSaved }:{ data:Bootstrap; onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const locations = data.locations.filter((item) => item.active);
  const [from, setFrom] = useState(locations[0]?.id || "");
  const [to, setTo] = useState(locations[1]?.id || "");
  const changeFrom = (value:string) => { setFrom(value); if (value === to) setTo(locations.find((item) => item.id !== value)?.id || ""); };
  const submit = (event:FormEvent<HTMLFormElement>) => { event.preventDefault(); submitter.run(() => api.transfer(Object.fromEntries(new FormData(event.currentTarget)))); };
  return <Modal title="Registrar traslado" subtitle="Mueve existencias entre ubicaciones sin modificar el stock total de la empresa." onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <label className="full">Producto<select name="productId">{data.products.filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label>
    <label>Origen<select name="from" value={from} onChange={(event) => changeFrom(event.target.value)}>{locations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <label>Destino<select name="to" value={to} onChange={(event) => setTo(event.target.value)}>{locations.filter((item) => item.id !== from).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <label>Cantidad<input name="quantity" type="number" min="1" required/></label><label>Motivo<input name="reason" required defaultValue="Reposición entre ubicaciones"/></label>
    {submitter.error ? <p className="form-error full">{submitter.error}</p> : null}<Actions saving={submitter.saving} onClose={onClose} label="Confirmar traslado"/>
  </form></Modal>;
}

export function PaymentModal({ data, onClose, onSaved }:{ data:Bootstrap; onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const pending = data.invoices.filter((item) => item.balance > 0);
  const submit = (event:FormEvent<HTMLFormElement>) => { event.preventDefault(); submitter.run(() => api.payment(Object.fromEntries(new FormData(event.currentTarget)))); };
  return <Modal title="Registrar pago" subtitle="Aplica un abono y concílialo con una caja abierta en la sede del comprobante." onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <label className="full">Comprobante pendiente<select name="invoiceId">{pending.map((item) => <option value={item.id} key={item.id}>{item.number} · Saldo S/ {item.balance.toFixed(2)}</option>)}</select></label>
    <label>Monto<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Medio<select name="method"><option>EFECTIVO</option><option>TARJETA</option><option>TRANSFERENCIA</option><option>YAPE_PLIN</option></select></label>
    <label className="full">Referencia<input name="reference" required placeholder="Operación, recibo o caja"/></label>
    {submitter.error ? <p className="form-error full">{submitter.error}</p> : null}<Actions saving={submitter.saving} onClose={onClose} label="Aplicar pago"/>
  </form></Modal>;
}

export function ReturnModal({ data, onClose, onSaved }:{ data:Bootstrap; onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const [invoiceId, setInvoiceId] = useState(data.invoices[0]?.id || "");
  const invoice = data.invoices.find((item) => item.id === invoiceId);
  const submit = (event:FormEvent<HTMLFormElement>) => { event.preventDefault(); const raw = Object.fromEntries(new FormData(event.currentTarget)); submitter.run(() => api.returnSale({ ...raw, invoiceId, returnToStock:raw.returnToStock === "on" })); };
  return <Modal title="Registrar devolución" subtitle="Conserva la venta original y genera la reversión de inventario correspondiente." onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <label className="full">Venta original<select value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)}>{data.invoices.map((item) => <option value={item.id} key={item.id}>{item.number} · {new Date(item.date).toLocaleDateString("es-PE")}</option>)}</select></label>
    <label className="full">Producto<select name="productId">{invoice?.items.map((line) => { const product = data.products.find((item) => item.id === line.productId); return <option value={line.productId} key={line.productId}>{product?.name} · vendido {line.quantity}</option>; })}</select></label>
    <label>Cantidad<input name="quantity" type="number" min="1" required/></label><label>Motivo<input name="reason" required placeholder="Motivo de la devolución"/></label>
    <label className="check-label full"><input name="returnToStock" type="checkbox" defaultChecked/> El producto retorna físicamente al inventario</label>
    {submitter.error ? <p className="form-error full">{submitter.error}</p> : null}<Actions saving={submitter.saving} onClose={onClose} label="Registrar devolución"/>
  </form></Modal>;
}

export function CashModal({ data, mode, onClose, onSaved }:{ data:Bootstrap; mode:"open"|"movement"|"close"; onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const open = data.cashSessions.filter((item) => item.status === "ABIERTA");
  const submit = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    submitter.run(() => mode === "open" ? api.openCash(payload) : mode === "movement" ? api.cashMovement(payload) : api.closeCash(payload));
  };
  const titles = { open:["Abrir caja", "Registra el fondo inicial y la tienda responsable."], movement:["Movimiento de caja", "Registra un ingreso o egreso autorizado."], close:["Cerrar caja", "Compara el efectivo contado con el saldo esperado."] } as const;
  return <Modal title={titles[mode][0]} subtitle={titles[mode][1]} onClose={onClose}><form className="form-grid" onSubmit={submit}>
    {mode === "open" ? <><label className="full">Tienda<select name="locationId">{data.locations.filter((item) => item.kind === "TIENDA" && !open.some((session) => session.locationId === item.id)).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="full">Fondo inicial<input name="openingAmount" type="number" min="0" step="0.01" defaultValue="0" required/></label></> : null}
    {mode === "movement" ? <><label className="full">Caja abierta<select name="cashSessionId">{open.map((item) => <option value={item.id} key={item.id}>{item.number} · {data.locations.find((location) => location.id === item.locationId)?.name}</option>)}</select></label><label>Tipo<select name="type"><option>INGRESO</option><option>EGRESO</option></select></label><label>Monto<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Medio<select name="method"><option>EFECTIVO</option><option>TARJETA</option><option>TRANSFERENCIA</option><option>YAPE_PLIN</option></select></label><label>Concepto<input name="concept" required/></label><label className="full">Referencia<input name="reference"/></label></> : null}
    {mode === "close" ? <><label className="full">Caja abierta<select name="cashSessionId">{open.map((item) => <option value={item.id} key={item.id}>{item.number} · {data.locations.find((location) => location.id === item.locationId)?.name}</option>)}</select></label><label className="full">Efectivo contado<input name="countedAmount" type="number" min="0" step="0.01" required/></label></> : null}
    {submitter.error ? <p className="form-error full">{submitter.error}</p> : null}<Actions saving={submitter.saving} onClose={onClose} label={mode === "open" ? "Abrir caja" : mode === "movement" ? "Registrar movimiento" : "Cerrar caja"}/>
  </form></Modal>;
}

export function UserModal({ data, onClose, onSaved }:{ data:Bootstrap; onClose:()=>void; onSaved:()=>void }) {
  const submitter = useSubmit(onSaved, onClose);
  const submit = (event:FormEvent<HTMLFormElement>) => { event.preventDefault(); submitter.run(() => api.user(Object.fromEntries(new FormData(event.currentTarget)))); };
  return <Modal title="Crear usuario" subtitle="Asigna un rol y una sede. La contraseña se almacena cifrada." onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <label className="full">Nombre completo<input name="name" required/></label><label>Correo<input name="email" type="email" required/></label>
    <label>Rol<select name="role"><option>GERENTE</option><option>JEFE</option><option>ADMINISTRACION</option><option>VENTAS</option><option>ALMACEN</option></select></label>
    <label>Sede<select name="locationId">{data.locations.filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <label>Contraseña temporal<input name="password" type="password" required placeholder="10+ caracteres, Aa1#"/></label>
    {submitter.error ? <p className="form-error full">{submitter.error}</p> : null}<Actions saving={submitter.saving} onClose={onClose} label="Crear usuario"/>
  </form></Modal>;
}
