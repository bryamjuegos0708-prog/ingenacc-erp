import { ArrowLeftRight, Boxes, ChartNoAxesCombined, CircleDollarSign, LayoutDashboard, MapPin, PackageCheck, PackageSearch, ReceiptText, Repeat2, Settings, ShieldCheck, ShoppingCart, Truck, UserCog, Users, WalletCards } from "lucide-react";
import type { Role } from "../types";

export const appNav = [
 {to:"/app/proformas",label:"Proformas y pedidos",icon:ReceiptText,roles:["JEFE","GERENTE","ADMINISTRACION","VENTAS"]},
 {to:"/app/garantias",label:"Garantías y series",icon:ShieldCheck,roles:["JEFE","GERENTE","ADMINISTRACION","VENTAS"]},
  { to:"/app", label:"Dashboard", icon:LayoutDashboard, roles:["JEFE","GERENTE","ADMINISTRACION","VENTAS","ALMACEN"] },
  { to:"/app/productos", label:"Productos", icon:PackageSearch, roles:["JEFE","GERENTE","ADMINISTRACION","VENTAS","ALMACEN"] },
  { to:"/app/inventario", label:"Inventario", icon:Boxes, roles:["JEFE","GERENTE","ADMINISTRACION","VENTAS","ALMACEN"] },
  { to:"/app/movimientos", label:"Kardex", icon:Repeat2, roles:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"] },
  { to:"/app/conteos", label:"Conteos físicos", icon:PackageCheck, roles:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"] },
  { to:"/app/traslados", label:"Traslados", icon:ArrowLeftRight, roles:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"] },
  { to:"/app/proveedores", label:"Proveedores", icon:Truck, roles:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"] },
  { to:"/app/compras", label:"Compras", icon:PackageCheck, roles:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"] },
  { to:"/app/clientes", label:"Clientes", icon:Users, roles:["JEFE","GERENTE","ADMINISTRACION","VENTAS"] },
  { to:"/app/ventas", label:"Ventas / POS", icon:ShoppingCart, roles:["JEFE","GERENTE","ADMINISTRACION","VENTAS"] },
  { to:"/app/facturacion", label:"Facturación", icon:ReceiptText, roles:["JEFE","GERENTE","ADMINISTRACION","VENTAS"] },
  { to:"/app/pagos", label:"Pagos", icon:CircleDollarSign, roles:["JEFE","GERENTE","ADMINISTRACION","VENTAS"] },
  { to:"/app/caja", label:"Caja", icon:WalletCards, roles:["JEFE","GERENTE"] },
  { to:"/app/ubicaciones", label:"Ubicaciones", icon:MapPin, roles:["JEFE","GERENTE","ADMINISTRACION","ALMACEN"] },
  { to:"/app/reportes", label:"Reportes", icon:ChartNoAxesCombined, roles:["JEFE","GERENTE"] },
  { to:"/app/auditoria", label:"Auditoría", icon:ShieldCheck, roles:["JEFE","GERENTE"] },
  { to:"/app/usuarios", label:"Usuarios", icon:UserCog, roles:["JEFE","GERENTE"] },
  { to:"/app/configuracion", label:"Configuración", icon:Settings, roles:["JEFE","GERENTE"] }
] as const;

export const navForRole = (role:Role) => appNav.filter((item) => (item.roles as readonly string[]).includes(role));
