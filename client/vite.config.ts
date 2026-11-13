import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:4000" } },
  build: {
    sourcemap:false,
    rollupOptions:{output:{manualChunks(id){
      if(id.includes("react-router")||id.includes("react-dom")||id.includes("/react/"))return "react-runtime";
      if(id.includes("lucide-react"))return "icons";
    }}}
  }
});
