import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { api } from "../api";
import type { Bootstrap } from "../types";

type Row = Record<string, unknown>;
type Preview = { total:number; valid:number; invalid:number; canImport:boolean; imported?:number; errors:{row:number;message:string}[] };
const clean = (value:unknown) => String(value ?? "").trim();
const key = (value:unknown) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const number = (value:unknown, fallback=0) => value === "" || value == null ? fallback : Number(String(value).replace(",", "."));

export function ProductImportModal({ data, onClose, onSaved }:{ data:Bootstrap; onClose:()=>void; onSaved:()=>void }) {
  const [rows,setRows]=useState<Row[]>([]),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const locations = new Map<string,string>();
  for (const location of data.locations.filter((item) => item.active)) { locations.set(key(location.id),location.id); locations.set(key(location.name),location.id); }
  const defaultLocation = data.locations.find((item) => item.active)?.id || "";
  const read = async(event:ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0]; if(!file)return;
    setBusy(true);setError("");setPreview(null);
    try{
      if(file.size>5_000_000)throw new Error("El archivo supera 5 MB. Divide el catálogo en archivos más pequeños.");
      const {default:readXlsxFile}=await import("read-excel-file");
      const sheet=await readXlsxFile(file,{sheet:"Productos"});
      if(sheet.length<2)throw new Error("La hoja Productos no contiene filas para importar.");
      if(sheet.length>2001)throw new Error("Se permiten hasta 2000 productos por importación.");
      const headers=sheet[0].map(key);
      const value=(row:unknown[],...names:string[])=>{for(const name of names){const index=headers.indexOf(key(name));if(index>=0)return row[index];}return "";};
      const mapped=sheet.slice(1).filter((row)=>row.some((cell)=>clean(cell))).map((row)=>{
        const locationText=value(row,"Ubicación","Ubicacion","Sede inicial");
        const sectorText=clean(value(row,"Sector"))||"Multipropósito";
        const sectors:Record<string,string>={construccion:"Construcción",agricultura:"Agricultura",mineria:"Minería",multiproposito:"Multipropósito",repuestos:"Repuestos"};
        return {
          code:clean(value(row,"Código","Codigo","SKU")),barcode:clean(value(row,"Código de barras","Codigo de barras","Barcode")),manufacturerCode:clean(value(row,"Código fabricante","Codigo fabricante"))||"Por validar",
          name:clean(value(row,"Producto","Nombre")),description:clean(value(row,"Descripción","Descripcion")),brand:clean(value(row,"Marca")),model:clean(value(row,"Modelo"))||"Por validar",
          sector:sectors[key(sectorText)]||sectorText,category:clean(value(row,"Categoría","Categoria")),subcategory:clean(value(row,"Subcategoría","Subcategoria"))||"Por validar",unit:clean(value(row,"Unidad"))||"UND",
          costPrice:number(value(row,"Costo","Costo unitario")),price:number(value(row,"Precio","Precio de venta")),minStock:number(value(row,"Stock mínimo","Stock minimo"),1),initialStock:number(value(row,"Stock inicial")),
          locationId:locations.get(key(locationText))||defaultLocation,power:clean(value(row,"Potencia","Capacidad"))||"Por validar",fuel:clean(value(row,"Combustible"))||"Por validar",origin:clean(value(row,"Origen"))||"Por validar",warranty:clean(value(row,"Garantía","Garantia"))||"Por validar"
        };
      });
      const result=await api.importProducts(mapped,false);setRows(mapped);setPreview(result);
    }catch(reason){setRows([]);setError(reason instanceof Error?reason.message:"No se pudo leer el archivo Excel.");}
    finally{setBusy(false);event.target.value="";}
  };
  const commit=async()=>{setBusy(true);setError("");try{const result=await api.importProducts(rows,true);setPreview(result);onSaved();setTimeout(onClose,700);}catch(reason){setError(reason instanceof Error?reason.message:"No se pudo importar el catálogo.");}finally{setBusy(false);}};
  return <div className="modal-backdrop"><div className="modal modal-wide import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
    <div className="modal-head"><div><h2 id="import-title">Importar productos desde Excel</h2><p>Valida todo el archivo antes de modificar inventario.</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X/></button></div>
    <div className="import-steps"><article><b>1</b><span><strong>Descarga la plantilla</strong><small>Conserva los encabezados y la hoja Productos.</small></span></article><article><b>2</b><span><strong>Completa el catálogo</strong><small>Máximo 2000 filas y 5 MB.</small></span></article><article><b>3</b><span><strong>Revisa e importa</strong><small>Ninguna fila se guarda si existe un error.</small></span></article></div>
    <div className="import-actions"><a className="button secondary" href="/plantilla-productos-ingenacc.xlsx" download><Download/>Descargar plantilla</a><label className="button primary file-button"><Upload/>{busy?"Procesando…":"Seleccionar Excel"}<input type="file" accept=".xlsx" onChange={read} disabled={busy}/></label></div>
    {error?<p className="form-error" role="alert"><AlertTriangle/>{error}</p>:null}
    {preview?<section className={preview.canImport?"import-result ready":"import-result blocked"}><header>{preview.canImport?<CheckCircle2/>:<AlertTriangle/>}<div><strong>{preview.canImport?`${preview.valid} productos listos`:`${preview.invalid} filas requieren corrección`}</strong><small>{preview.total} filas leídas · {preview.valid} válidas · {preview.invalid} inválidas</small></div></header>{preview.errors.length?<div className="import-errors">{preview.errors.map((item)=><span key={`${item.row}-${item.message}`}><b>Fila {item.row}</b>{item.message}</span>)}</div>:null}{preview.imported?<p><CheckCircle2/> Se importaron {preview.imported} productos correctamente.</p>:null}</section>:<div className="import-placeholder"><FileSpreadsheet/><span>Selecciona la plantilla completada para mostrar la validación.</span></div>}
    <div className="form-actions"><button className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy||!preview?.canImport||Boolean(preview.imported)} onClick={commit}>{busy?"Importando…":"Confirmar importación"}</button></div>
  </div></div>;
}
