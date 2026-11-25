import { defineConfig } from "vite";
import { fotos, iniciarLimpeza } from "./server/fotos.mjs";
import {perfil} from './server/perfil.mjs'

export default defineConfig({
  plugins: [
    {
      name: "fotos-privadas",
      configureServer(server) {
        const parar = iniciarLimpeza();
        server.httpServer?.once("close", parar);
        server.middlewares.use("/api/fotos", fotos);
        server.middlewares.use("/api/perfil",perfil);
      },
      configurePreviewServer(server) {
        const parar = iniciarLimpeza();
        server.httpServer.once("close", parar);
        server.middlewares.use("/api/fotos", fotos);
        server.middlewares.use("/api/perfil",perfil);
      },
    },
  ],
});
