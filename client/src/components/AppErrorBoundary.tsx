import { Component, type ErrorInfo, type ReactNode } from "react";

type State = { failed:boolean };

export class AppErrorBoundary extends Component<{children:ReactNode}, State> {
  state:State = { failed:false };

  static getDerivedStateFromError():State { return { failed:true }; }

  componentDidCatch(error:Error, info:ErrorInfo) {
    console.error("INGENACC UI", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="app-recovery" role="alert">
      <img src="/images/inacc.svg" alt="Inacc"/>
      <h1>No pudimos mostrar esta pantalla</h1>
      <p>La operación guardada no se ha eliminado. Recarga la interfaz para continuar.</p>
      <button className="button primary" onClick={() => window.location.reload()}>Recargar INGENACC</button>
    </main>;
  }
}
