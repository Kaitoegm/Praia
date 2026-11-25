import { timingSafeEqual } from "node:crypto";
import { entregar } from "../server/avisos.mjs";
import { banco } from "../server/fotos.mjs";

export default async function processar(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  const token = process.env.OHANA_PUSH_TOKEN;
  const recebido = Buffer.from(req.headers.authorization ?? "");
  const esperado = Buffer.from("Bearer " + token);
  if (!token || recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado))
    return res.status(401).end();
  try {
    await entregar(banco());
    return res.status(204).end();
  } catch {
    return res.status(503).end();
  }
}
