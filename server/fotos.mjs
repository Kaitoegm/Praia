import moldurasMarinho from "../src/features/album/molduras-marinho.json" with { type: "json" };
import { createClient } from "@supabase/supabase-js";
import { localSettings } from "../scripts/supabase-local.mjs";
import { limite, processar } from "./imagens.mjs";
import { assinaturaValida, entregar, vapid } from "./avisos.mjs";

let client;
export function banco() {
  if (!client) {
    if (process.env.NODE_ENV === "production" &&
        (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      throw new Error("Configuração do Supabase incompleta.");
    }
    const env =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? {
            API_URL: process.env.SUPABASE_URL,
            SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          }
        : localSettings();
    client = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
const bucket = () => banco().storage.from("album-privado");
const caminhos = (id) => [id + "/foto.jpg", id + "/mini.jpg"];
export async function dados(req, max) {
  const partes = [];
  let total = 0;
  for await (const parte of req) {
    total += parte.length;
    if (total > max) throw falha(413, "Selecione uma foto de até 15 MB.");
    partes.push(parte);
  }
  return Buffer.concat(partes);
}
function falha(status, message) {
  return Object.assign(new Error(message), { status });
}
async function assinar(path) {
  const { data, error } = await bucket().createSignedUrl(path, 900);
  if (error) throw error;
  return data.signedUrl;
}
let limpeza;
async function limpar() {
  const tabela = banco().from("tentativas_foto");
  const expira = new Date(Date.now() - 86400000).toISOString();
  await tabela
    .update({ descartada: true })
    .eq("confirmada", false)
    .eq("descartada", false)
    .lt("criada_em", expira);
  const { data } = await tabela
    .select("id")
    .eq("descartada", true)
    .eq("limpa", false)
    .limit(32);
  for (const t of data ?? []) {
    const r = await bucket().remove(caminhos(t.id));
    if (!r.error) await tabela.update({ limpa: true }).eq("id", t.id);
  }
}
export function iniciarLimpeza(iniciarBanco=false) {
  if(iniciarBanco)banco()
  const push = setInterval(() => {
    if (client) void entregar(client).catch(() => {});
  }, 12000);
  push.unref();
  const timer = setInterval(() => {
    if (client && !limpeza)
      limpeza = limpar()
        .catch(() => {})
        .finally(() => {
          limpeza = null;
        });
  }, 60000);
  timer.unref();
  return () => {
    clearInterval(timer);
    clearInterval(push);
  };
}
export async function fotos(req, res) {
  const enviar = (status, body) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
  };
  try {
    const url = new URL(req.url, "http://localhost");
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw falha(401, "Entre na viagem novamente.");
    const db = banco(),
      auth = await db.auth.getUser(token);
    if (auth.error || !auth.data.user) throw falha(401, "Sessão expirada.");
    const autor_id = auth.data.user.id;
    if (url.searchParams.get("acao") === "push") {
      const membro = await db
        .from("participantes")
        .select("vaga")
        .eq("usuario_id", autor_id)
        .single();
      if (membro.error) throw falha(403, "Acesso indisponível.");
      if (req.method === "GET")
        return enviar(200, { chave: vapid().publicKey });
      const s = JSON.parse((await dados(req, 8192)).toString());
      if (!assinaturaValida(s)) throw falha(400, "Aparelho incompatível.");
      const r = await db
        .from("aparelhos_push")
        .upsert({ endpoint: s.endpoint, usuario_id: autor_id, assinatura: s });
      if (r.error) throw r.error;
      return enviar(200, { ok: true });
    }
    if (req.method === "GET") {
      const p = await db
        .from("participantes")
        .select("viagem_id,vaga")
        .eq("usuario_id", autor_id)
        .single();
      if (p.error) throw falha(403, "Acesso indisponível.");
      const familia = url.searchParams.get("colecao") === "familia";
      const r = familia
        ? await db.rpc("fotos_familia", { viagem: p.data.viagem_id })
        : await db.from("vagas_foto")
            .select("vaga,posicao,versao,arquivo,legenda")
            .eq("viagem_id", p.data.viagem_id).eq("vaga", p.data.vaga)
            .order("posicao");
      if (r.error) throw r.error;
      const paths = r.data
        .filter((v) => v.arquivo)
        .flatMap((v) => caminhos(v.arquivo));
      const signed = new Map();
      if (paths.length) {
        const batch = await bucket().createSignedUrls(paths, 900);
        if (batch.error) throw batch.error;
        for (const item of batch.data) {
          if (item.error) throw Error(item.error);
          signed.set(item.path, item.signedUrl);
        }
      }
      return enviar(
        200,
        await Promise.all(
          r.data.map(async (v) => {
            const [foto, mini] = v.arquivo
              ? caminhos(v.arquivo).map((path) => signed.get(path))
              : [null, null];
            return {
              vaga: v.vaga,
              posicao: v.posicao,
              versao: v.versao,
              legenda: v.legenda,
              cor: v.cor,
              amostra: v.amostra,
              foto,
              mini,
            };
          }),
        ),
      );
    }
    if (req.method !== "POST") throw falha(405, "Método inválido.");
    const acao = url.searchParams.get("acao");
    const pos = Number(url.searchParams.get("posicao")),
      esperada = Number(url.searchParams.get("versao"));
    const tentativa = url.searchParams.get("tentativa");
    if (
      !Number.isInteger(pos) ||
      pos < 1 ||
      pos > 9 ||
      !url.searchParams.has("versao") ||
      !Number.isInteger(esperada) ||
      esperada < 0 ||
      !["preparar", "confirmar", "remover"].includes(acao)
    )
      throw falha(400, "Dados da vaga inválidos.");
    const operar = async (operacao, texto = null) => {
      const { data, error } = await db.rpc("operar_foto", {
        autor_id,
        operacao,
        pos,
        esperada,
        tentativa,
        texto,
      });
      if (error)
        throw falha(409, "A vaga mudou ou está indisponível. Reabra a foto.");
      return data;
    };
    if (acao === "preparar") {
      if (Number(req.headers["content-length"]) > limite)
        throw falha(413, "Selecione uma foto de até 15 MB.");
      const bytes = await dados(req, limite);
      const state = await operar("iniciar");
      if (!state.pronta) {
        const atribuicao = await db.from("atribuicoes_cor")
          .select("cor_id,participantes!inner(usuario_id)").eq("participantes.usuario_id", autor_id).maybeSingle();
        if (atribuicao.error) throw atribuicao.error;
        const moldura = atribuicao.data?.cor_id === 6 ? moldurasMarinho[pos-1] : undefined;
        let img;
        try {
          img = await processar(bytes, moldura);
        } catch {
          throw falha(
            422,
            "Não foi possível ler esta imagem. Escolha uma versão JPEG, PNG ou WebP.",
          );
        }
        const paths = caminhos(tentativa);
        for (const [i, body] of [img.imagem, img.miniatura].entries()) {
          const r = await bucket().upload(paths[i], body, {
            contentType: "image/jpeg",
            upsert: false,
          });
          if (
            r.error &&
            String(r.error.statusCode) !== "409" &&
            r.error.error !== "Duplicate" &&
            !/already exists/i.test(r.error.message)
          )
            throw r.error;
        }
        await operar("preparar");
      }
      return enviar(200, { preview: await assinar(caminhos(tentativa)[0]) });
    }
    if (acao === "confirmar") {
      const { legenda } = JSON.parse((await dados(req, 8192)).toString());
      if (typeof legenda !== "string" || legenda.length > 500)
        throw falha(400, "Use uma legenda de até 500 caracteres.");
      await operar("confirmar", legenda.trim());
      await entregar(db).catch(() => console.error("Entrega adiada para a fila de avisos."));
    } else await operar("remover");
    enviar(200, { ok: true });
  } catch (e) {
    enviar(e.status ?? 503, {
      message: e.status
        ? e.message
        : "Não foi possível concluir. Tente novamente.",
    });
  }
}
