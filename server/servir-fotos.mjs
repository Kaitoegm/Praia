import { createServer } from "node:http";
import { fotos, iniciarLimpeza } from "./fotos.mjs";
import {perfil} from './perfil.mjs'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw Error("Configure o acesso do serviço ao Supabase.");
iniciarLimpeza(true);
createServer((req, res) => {
  if (req.url.split("?")[0] === "/api/fotos") return fotos(req, res);
  if (req.url.split("?")[0] === "/api/perfil") return perfil(req,res);
  res.writeHead(404).end();
}).listen(Number(process.env.PORT ?? 3001));
