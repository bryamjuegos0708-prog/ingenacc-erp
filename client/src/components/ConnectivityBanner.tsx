import { useEffect, useState } from "react";

export function ConnectivityBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  if (online) return null;
  return <div className="connectivity-banner" role="status">Sin conexión de red. Puedes consultar la pantalla actual, pero no guardes operaciones hasta recuperar la conexión.</div>;
}
