import { randomBytes, createHash } from "node:crypto";
import { recuperarAparelho } from "./recuperar-aparelho.mjs";
import sharp from "sharp";
import { banco, dados } from "./fotos.mjs";
import { processar, limite } from "./imagens.mjs";
const hash = (v) => createHash("sha256").update(v).digest("hex");
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
        .select("vaga,nome")
        .eq("viagem_id", c.data.viagem_id)
        .order("vaga");
      const d = await db
        .from("aparelho_viajante")
        .select("vaga,hash")
        .eq("viagem_id", c.data.viagem_id);
      if (r.error || d.error) throw erro(503, "Tente novamente.");
      return reply(
        200,
        r.data.map((p) => {
          const dono = d.data.find((a) => a.vaga === p.vaga);
          const meu = Boolean(dono && (dono.hash === hash(chave) || (p.vaga === 1 && c.data.organizador)));
          return {
            ...p,
            meu,
            disponivel:
              meu || (!dono && (p.vaga !== 1 || c.data.organizador)),
          };
        }),
      );
    }
    if (req.method !== "POST" || !device) throw erro(403, "Reabra o convite.");
    const pos = Number(
      new URL(req.url, "http://localhost").searchParams.get("vaga"),
    );
    const p = await db
      .from("participantes")
      .select("email,usuario_id")
      .eq("viagem_id", c.data.viagem_id)
      .eq("vaga", pos)
      .single();
    if (p.error) throw erro(404, "Nome indisponível.");
    const d = await db
      .from("aparelho_viajante")
      .select("hash")
      .match({ viagem_id: c.data.viagem_id, vaga: pos })
      .maybeSingle();
    if (pos === 1 && !c.data.organizador && d.data?.hash !== hash(device))
      throw erro(403, "Esta vaga é do organizador.");
    const acessoJuan = pos === 1 && c.data.organizador && d.data && p.data.usuario_id;
    if (d.error || (d.data && d.data.hash !== hash(device) && !acessoJuan))
      throw erro(409, "Este nome já foi cadastrado.");
    const foto = d.data ? null : await retrato(req);
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
    if (acessoJuan && login.data.user.id === p.data.usuario_id)
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
