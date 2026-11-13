import { jwtDecode } from "jwt-decode";
import type { Bootstrap, PublicBootstrap, Session, Proforma } from "./types";

const sessionKey = "ingenacc_session_v4";
const legacySessionKeys = ["ingenacc_session_v2", "ingenacc_session_v3"];
const requestTimeoutMs = 15_000;

export class ApiError extends Error {
  status:number;
  constructor(message:string, status:number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const removeLegacySessions = () => [sessionKey,...legacySessionKeys].forEach((key) => localStorage.removeItem(key));

export const getSession = (): Session | null => {
  try {
    removeLegacySessions();
    const raw = sessionStorage.getItem(sessionKey);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    const decoded = jwtDecode<{ exp?:number }>(session.token);
    if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
      sessionStorage.removeItem(sessionKey);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(sessionKey);
    return null;
  }
};

export const saveSession = (session:Session) => { removeLegacySessions(); sessionStorage.setItem(sessionKey, JSON.stringify(session)); };
export const clearSession = () => { sessionStorage.removeItem(sessionKey); removeLegacySessions(); };

const request = async <T,>(url:string, options?:RequestInit):Promise<T> => {
  const token = getSession()?.token;
  let response:Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);
  const abort = () => controller.abort();
  options?.signal?.addEventListener("abort", abort, { once:true });
  try {
    response = await fetch(url, {
      ...options,
      signal:controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization:`Bearer ${token}` } : {}),
        ...(options?.headers || {})
      }
    });
  } catch (reason) {
    const timeoutMessage = reason instanceof DOMException && reason.name === "AbortError"
      ? "El servidor tardó demasiado en responder. Verifica la red e inténtalo nuevamente."
      : "No se pudo conectar con el servidor. Verifica que INGENACC ERP esté iniciado.";
    throw new ApiError(timeoutMessage, 0);
  } finally {
    window.clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", abort);
  }
  const raw = await response.text();
  let body: { message?:string; data?:T } = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
  if (response.status === 401 && url !== "/api/auth/login") clearSession();
  if (!response.ok) throw new ApiError(body.message || (response.status === 429 ? "Demasiados intentos. Espera unos minutos e inténtalo otra vez." : "No se pudo completar la operación."), response.status);
  if (!("data" in body)) throw new ApiError("El servidor devolvió una respuesta incompleta.", response.status);
  return body.data as T;
};

const post = <T,>(url:string, payload:Record<string,unknown>) => request<T>(url, { method:"POST", body:JSON.stringify(payload) });

async function downloadFile(url:string, fallbackName:string) {
  const token = getSession()?.token;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60_000);
  let response:Response;
  try { response = await fetch(url, { headers:token ? { Authorization:`Bearer ${token}` } : {}, signal:controller.signal }); }
  catch { throw new Error("No se pudo descargar el respaldo. Revisa la conexión e inténtalo nuevamente."); }
  finally { window.clearTimeout(timeout); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "No se pudo generar el respaldo");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || fallbackName;
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

export const api = {
  setupStatus: () => request<{required:boolean;tokenRequired:boolean;locations:{id:string;name:string}[];company:{legalName:string;tradeName:string;ruc:string;address:string}}>("/api/setup/status"),
  initialize: (payload:Record<string,unknown>) => request<{initialized:boolean;email:string}>("/api/setup/initialize",{method:"POST",body:JSON.stringify(payload)}),
 pricing:(id:string,payload:Record<string,unknown>)=>post(`/api/products/${id}/pricing`,payload),
 equipment:(payload:Record<string,unknown>)=>post("/api/equipment",payload),
 serviceCase:(payload:Record<string,unknown>)=>post("/api/service-cases",payload),
 serviceStatus:(id:string,payload:Record<string,unknown>)=>post(`/api/service-cases/${id}/status`,payload),
  logout: () => post("/api/auth/logout", {}),
  physicalCount: (payload:Record<string,unknown>) => post("/api/physical-counts", payload),
  reviewCount: (id:string, approve:boolean) => post(`/api/physical-counts/${id}/review`, {approve}),
  publicBootstrap: () => request<PublicBootstrap>("/api/public/bootstrap"),
  simulateProforma: (payload:Record<string,unknown>) => request<Proforma>("/api/proformas/simulate",{method:"POST",body:JSON.stringify(payload)}),
  saveProforma: (payload:Record<string,unknown>) => request<Proforma>("/api/proformas",{method:"POST",body:JSON.stringify(payload)}),
  acceptProforma:(id:string,payload:Record<string,unknown>)=>post(`/api/proformas/${id}/order`,payload),
  orderPayment:(id:string,payload:Record<string,unknown>)=>post(`/api/customer-orders/${id}/payments`,payload),
  deliverOrder:(id:string)=>post(`/api/customer-orders/${id}/deliver`,{}),
  bootstrap: () => request<Bootstrap>("/api/bootstrap"),
  login: (email:string, password:string) => request<Session>("/api/auth/login", { method:"POST", body:JSON.stringify({ email:email.trim().toLowerCase(), password }) }),
  movement: (payload:Record<string,unknown>) => post("/api/movements", payload),
  transfer: (payload:Record<string,unknown>) => post("/api/transfers", payload),
  product: (payload:Record<string,unknown>) => post("/api/products", payload),
  importProducts: (rows:Record<string,unknown>[], commit=false) => post<{total:number;valid:number;invalid:number;canImport:boolean;imported?:number;errors:{row:number;message:string}[]}>("/api/products/import", { rows, commit }),
  client: (payload:Record<string,unknown>) => post("/api/clients", payload),
  supplier: (payload:Record<string,unknown>) => post("/api/suppliers", payload),
  purchase: (payload:Record<string,unknown>) => post("/api/purchases", payload),
  receivePurchase: (id:string, requestId:string, items:{line:number;quantity:number}[]) => post(`/api/purchases/${id}/receive`, { requestId, items }),
  sale: (payload:Record<string,unknown>) => post("/api/sales", payload),
  payment: (payload:Record<string,unknown>) => post("/api/payments", payload),
  returnSale: (payload:Record<string,unknown>) => post("/api/returns", payload),
  openCash: (payload:Record<string,unknown>) => post("/api/cash/open", payload),
  cashMovement: (payload:Record<string,unknown>) => post("/api/cash/movements", payload),
  closeCash: (payload:Record<string,unknown>) => post("/api/cash/close", payload),
  user: (payload:Record<string,unknown>) => post("/api/users", payload),
  quote: (payload:Record<string,string>) => post("/api/quotes", payload),
  downloadBackup: () => downloadFile("/api/backups/export", "ingenacc-backup.json"),
  downloadDatabase: () => downloadFile("/api/backups/database", "ingenacc-database.db"),
  backupStatus: () => request<{enabled:boolean;configured:boolean;directory:string;lastSuccess:string|null;lastFile:string|null;lastBytes:number;lastHash:string|null;lastError:string|null}>("/api/backups/status"),
  createAutomaticBackup: () => post<{enabled:boolean;configured:boolean;directory:string;lastSuccess:string|null;lastFile:string|null;lastBytes:number;lastHash:string|null;lastError:string|null}>("/api/backups/automatic", {})
};

export function newRequestId(){
 const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
 const h=Array.from(b,n=>n.toString(16).padStart(2,"0")).join("");return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
