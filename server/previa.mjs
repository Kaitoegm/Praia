import { createServer, request } from "node:http";
import { request as requestHttps } from "node:https";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fotos, iniciarLimpeza } from "./fotos.mjs";
import { perfil } from "./perfil.mjs";
import { localSettings } from "../scripts/supabase-local.mjs";
const producao = process.argv.includes("--producao");
if (producao) {
  process.env.NODE_ENV = "production";
  for (const nome of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]) {
    if (!process.env[nome]?.trim()) throw Error("Configure " + nome + " no servidor.");
  }
}
const root = resolve("dist");
const api = new URL(producao ? process.env.SUPABASE_URL : localSettings().API_URL);
const encaminhar = api.protocol === "https:" ? requestHttps : request;
const tipos = {
  ".js": "application/javascript",
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};
iniciarLimpeza(true);
createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://localhost"),
      p = u.pathname;
    if (p === "/api/fotos") return fotos(req, res);
    if (p === "/api/perfil") return perfil(req, res);
    if (p.startsWith("/servicos/")) {
      const dest = p.slice("/servicos".length);
      if (!(
        /^\/rest\/v1\/[a-z_]+$/.test(dest) ||
        /^\/rest\/v1\/rpc\/[a-z_]+$/.test(dest) ||
        /^\/auth\/v1\/(token|verify|logout|user)$/.test(dest) ||
        (dest.startsWith("/storage/v1/object/sign/album-privado/") &&
          req.method === "GET")
      ))
        return res.writeHead(404).end();
      const headers = {};
      for (const h of [
        "authorization",
        "apikey",
        "content-type",
        "accept",
        "prefer",
        "range",
        "content-profile",
        "accept-profile",
      ])
        if (req.headers[h]) headers[h] = req.headers[h];
      const upstream = encaminhar(
        new URL(dest + u.search, api),
        { method: req.method, headers },
        (r) => {
          res.writeHead(r.statusCode, r.headers);
          r.pipe(res);
        },
      );
      upstream.on("error", () => res.writeHead(502).end());
      req.pipe(upstream);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD")
      return res.writeHead(405).end();
    const path = resolve(
      root,
      "." + (extname(p) ? decodeURIComponent(p) : "/index.html"),
    );
    if (!path.startsWith(root + sep)) return res.writeHead(404).end();
    const bytes = await readFile(path);
    res
      .writeHead(200, {
        "Content-Type": tipos[extname(path)] || "application/octet-stream",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      })
      .end(bytes);
  } catch {
    res.writeHead(404).end();
  }
}).listen(producao ? Number(process.env.PORT || 3001) : 4188, producao ? "0.0.0.0" : "127.0.0.1");
