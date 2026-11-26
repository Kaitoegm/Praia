import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { dados } from "./fotos.mjs";

const antigo = "https://praia-six.vercel.app";
const atual = "https://ferias-ohana.vercel.app";
const caminho = "/api/perfil?recuperar";
const cookieValido = valor => /^[a-f0-9]{64}$/.test(valor ?? "");
const chave = () => createHash("sha256").update("ohana:migracao:").update(process.env.SUPABASE_SERVICE_ROLE_KEY).digest();

function pagina(res, mensagem, form) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action " + antigo + " " + atual,
  });
  res.end(`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Recuperar perfil · OHANA</title><style>body{margin:10vh auto;padding:24px;max-width:28rem;background:#faf5ea;color:#183e48;font:18px/1.5 system-ui}button,a{font:inherit;color:#124c55}button{padding:12px 18px;border:0;border-radius:12px;background:#174952;color:white}</style><main><h1>Seu perfil OHANA</h1><p>${mensagem}</p>${form}</main></html>`);
}

export async function recuperarAparelho(req, res, db, viagem, device) {
  const host = req.headers.host;
  if (host === new URL(antigo).host) {
    if (req.method === "GET") return pagina(res, "Use o celular e o navegador em que você entrou na viagem.", `<form method="post" action="${caminho}"><button>Encontrar meu perfil</button></form>`);
    if (req.method === "POST" && req.headers.origin === antigo) {
      const registro = cookieValido(device) && await db.from("aparelho_viajante").select("vaga").match({ viagem_id: viagem, hash: createHash("sha256").update(device).digest("hex") }).limit(1);
      if (registro?.error) throw registro.error;
      if (!registro || !registro.data.length) return pagina(res, "Este navegador não tem um cadastro da viagem. Se você já entrou antes, abra esta página no navegador original.", `<a href="${atual}">Voltar ao OHANA</a>`);
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", chave(), iv);
      const bytes = Buffer.concat([cipher.update(JSON.stringify({device, viagem, ate: Date.now() + 120000})), cipher.final()]);
      const ticket = Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64url");
      return pagina(res, "Encontramos seu cadastro. Continue para usar seu perfil no novo endereço.", `<form method="post" action="${atual}${caminho}"><input type="hidden" name="ticket" value="${ticket}"><button>Continuar no OHANA</button></form>`);
    }
  }
  if (host === new URL(atual).host && req.method === "POST" && req.headers.origin === antigo) {
    const body = req.body ?? (await dados(req, 2048)).toString();
    const ticket = typeof body === "string" ? new URLSearchParams(body).get("ticket") : body.ticket;
    try {
      const raw = Buffer.from(ticket, "base64url");
      const decipher = createDecipheriv("aes-256-gcm", chave(), raw.subarray(0,12));
      decipher.setAuthTag(raw.subarray(12,28));
      const perfil = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString());
      if (perfil.viagem !== viagem || perfil.ate < Date.now() || !cookieValido(perfil.device)) throw Error();
      res.writeHead(303, {location: "/entrar", "cache-control":"no-store", "set-cookie":"praia_aparelho=" + perfil.device + "; Path=/api/perfil; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000"});
      return res.end();
    } catch {
      return pagina(res, "O tempo para recuperar o perfil terminou.", `<a href="${antigo}${caminho}">Tentar novamente</a>`);
    }
  }
  throw Object.assign(Error("Acesso indisponível."), {status: 403});
}
