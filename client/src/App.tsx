import InaccAssistant from "./components/InaccAssistant";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ConnectivityBanner } from "./components/ConnectivityBanner";
import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { getSession } from "./api";
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
function RequireSession(){return getSession()?.token ? <Admin/> : <Navigate to="/login" replace/>;}
export default function App(){return <AppErrorBoundary><ConnectivityBanner/><InaccAssistant/><Suspense fallback={<div className="page-loader" role="status">Cargando INGENACC…</div>}><Routes><Route path="/" element={<Navigate to={getSession()?.token?"/app":"/login"} replace/>}/><Route path="/login" element={getSession()?.token?<Navigate to="/app" replace/>:<Login/>}/><Route path="/app/*" element={<RequireSession/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Suspense></AppErrorBoundary>}
