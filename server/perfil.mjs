import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { recuperarAparelho } from "./recuperar-aparelho.mjs";
import sharp from "sharp";
import { banco, dados } from "./fotos.mjs";
import { processar, limite } from "./imagens.mjs";
const hash = (v) => createHash("sha256").update(v).digest("hex");
const tentativasJuan = new Map();
const erro = (status, message) => Object.assign(Error(message), { status });
async function retrato(req) {
  const bytes = await dados(req, limite);
  try {
    const { miniatura } = await processar(bytes);
    const jpeg = await sharp(miniatura)
      .resize(192, 192, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return "data:image/jpeg;base64," + jpeg.toString("base64");
  } catch {
    throw erro(422, "Escolha uma foto JPEG, PNG, WebP ou HEIC de até 15 MB.");
  }
}
export async function perfil(req, res) {
  const reply = (s, data) => {
    res.writeHead(s, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  try {
    const db = banco();
    if (req.method === "POST" && req.headers.authorization) {
      const { data, error } = await db.auth.getUser(
        req.headers.authorization.replace(/^Bearer /, ""),
      );
      if (error || !data.user) throw erro(401, "Entre novamente.");
      const avatar = await retrato(req);
      const r = await db
        .from("participantes")
        .update({ avatar })
        .eq("usuario_id", data.user.id)
        .select("vaga")
        .single();
      if (r.error) throw erro(403, "Perfil indisponível.");
      return reply(200, { ok: true });
    }
    const cookies = Object.fromEntries(
      (req.headers.cookie ?? "").split(";").map((s) => s.trim().split("=")),
    );
    const convite = req.headers["x-convite"] || cookies.praia_convite;
    if (convite && (typeof convite !== "string" || !/^\w{64}$/.test(convite)))
      throw erro(403, "Abra o convite da viagem para escolher seu nome.");
    // Identificador do convite familiar da viagem publicada (sem permissão administrativa).
    const familia = "295f195b8c8ec611e30533fadd4f8a687bd899b4a9315d784fb29eb5da37de50";
    let consulta = db
      .from("convites_viajante")
      .select("*")
      .eq("hash", convite ? hash(convite) : familia);
    if (!convite) consulta = consulta.eq("organizador", false);
    const c = await consulta.single();
    if (c.error) {
      if (c.error.code === "PGRST116") throw erro(403, "Convite indisponível.");
      console.error("Consulta do convite falhou", {
        status: c.status,
        codigo: c.error.code,
        chaveInvalida: /invalid api key|invalid jwt/i.test(c.error.message),
      });
      throw erro(503, "O cadastro está temporariamente indisponível.");
    }
    const senhaJuan = process.env.OHANA_SENHA_JUAN;
    const exigeSenha = Boolean(senhaJuan) || process.env.NODE_ENV === "production";
    const device = cookies.praia_aparelho;
    if (new URL(req.url, "http://localhost").searchParams.has("recuperar"))
      return await recuperarAparelho(req, res, db, c.data.viagem_id, device);
    if (req.method === "GET") {
      const chave = /^[a-f0-9]{64}$/.test(device ?? "")
        ? device
        : randomBytes(32).toString("hex");
      const attrs =
        "; Path=/api/perfil; HttpOnly; SameSite=Strict; Max-Age=31536000" +
        (req.socket.encrypted || req.headers["x-forwarded-proto"]==="https" ? "; Secure" : "");
      res.setHeader("Set-Cookie", [
        "praia_aparelho=" + chave + attrs,
        ...(convite ? ["praia_convite=" + convite + attrs] : []),
      ]);
      const r = await db
        .from("participantes")
        .select("vaga,nome,usuario_id")
        .eq("viagem_id", c.data.viagem_id)
        .order("vaga");
      if (r.error) throw erro(503, "Tente novamente.");
      return reply(200, r.data.map(({ vaga, nome, usuario_id }) => ({
        vaga, nome, cadastrado: Boolean(usuario_id),
        exigeSenha: vaga === 1 && (exigeSenha || !c.data.organizador),
      })));
    }
    if (req.method !== "POST" || !device) throw erro(403, "Reabra o convite.");
    const pos = Number(
      new URL(req.url, "http://localhost").searchParams.get("vaga"),
    );
    if (pos === 1 && exigeSenha) {
      if (!senhaJuan) throw erro(503, "A entrada do organizador está indisponível.");
      const agora = Date.now();
      for (const [ip, tentativa] of tentativasJuan)
        if (tentativa.expira <= agora) tentativasJuan.delete(ip);
      const ip = req.headers["x-real-ip"] ?? req.socket.remoteAddress;
      const tentativa = tentativasJuan.get(ip) ?? { total: 0, expira: agora + 60_000 };
      if (tentativa.total >= 5) throw erro(429, "Aguarde um minuto e tente novamente.");
      const informada = req.headers["x-ohana-senha"];
      if (typeof informada !== "string" || !timingSafeEqual(
        createHash("sha256").update(informada).digest(),
        createHash("sha256").update(senhaJuan).digest(),
      )) {
        tentativa.total++;
        tentativasJuan.set(ip, tentativa);
        throw erro(403, "Senha incorreta.");
      }
      tentativasJuan.delete(ip);
    } else if (pos === 1 && !c.data.organizador) {
      throw erro(403, "A entrada do organizador está indisponível.");
    }
    const p = await db
      .from("participantes")
      .select("email,usuario_id")
      .eq("viagem_id", c.data.viagem_id)
      .eq("vaga", pos)
      .single();
    if (p.error) throw erro(404, "Nome indisponível.");
    const foto = p.data.usuario_id ? null : await retrato(req);
    if (!p.data.usuario_id)
      await db.auth.admin.createUser({
        email: p.data.email,
        email_confirm: true,
      });
    // O link administrativo fornece uma sessão para a identidade interna, sem enviar mensagens.
    const login = await db.auth.admin.generateLink({
      type: "magiclink",
      email: p.data.email,
    });
    if (login.error) throw erro(503, "Não foi possível iniciar a sessão.");
    if (p.data.usuario_id && login.data.user.id !== p.data.usuario_id)
      throw erro(409, "Perfil incompatível.");
    if (p.data.usuario_id)
      return reply(200, { token_hash: login.data.properties.hashed_token });
    const r = await db.rpc("assumir_perfil", {
      viagem: c.data.viagem_id,
      pos,
      dispositivo: hash(device),
      identidade: login.data.user.id,
      retrato: foto,
    });
    if (r.error || !r.data)
      throw erro(409, "Não foi possível ocupar esta vaga. Atualize a lista.");
    return reply(200, { token_hash: login.data.properties.hashed_token, primeiroPerfil: foto ? login.data.user.id : null });
  } catch (e) {
    reply(Number(e.status) || 503, {
      message: e.status ? e.message : "Não foi possível abrir o perfil.",
    });
  }
}
