import { useEffect, useState } from "react";
import { db } from "./client";
import { FotoPerfil } from "./FotoPerfil";
type Opcao = { vaga: number; nome: string; cadastrado: boolean; exigeConvite?: boolean };
export function Entrada({ primeiroPerfil }: { primeiroPerfil: (id: string) => void }) {
  const [lista, setLista] = useState<Opcao[]>([]),
    [vaga, setVaga] = useState(""),
    [foto, setFoto] = useState<File | null>(null),
    [aviso, setAviso] = useState(""),
    [busy, setBusy] = useState(false);
  const [acesso, setAcesso] = useState(() => new URLSearchParams(location.hash.slice(1)).get("acesso"));
  useEffect(() => {
    function receberLink() {
      const token = new URLSearchParams(location.hash.slice(1)).get("acesso");
      if (token) { setAcesso(token); setAviso(""); }
    }
    window.addEventListener("hashchange", receberLink);
    return () => window.removeEventListener("hashchange", receberLink);
  }, []);
  async function abrirPerfil() {
    if (!acesso || busy) return;
    setBusy(true);
    try {
      const { error } = await db.auth.verifyOtp({ type: "magiclink", token_hash: acesso });
      if (error) throw error;
    } catch {
      setAviso("O link expirou ou já foi usado. Volte para a lista e selecione seu nome.");
    } finally {
      setBusy(false);
    }
  }
  const pessoa = lista.find((p) => String(p.vaga) === vaga);
  useEffect(() => {
    let ativa = true;
    async function carregar() {
      if (acesso) { history.replaceState(null, "", location.pathname + location.search); return; }
      const convite = new URLSearchParams(location.hash.slice(1)).get(
        "convite",
      );
      const r = await fetch("/api/perfil", {
        headers: convite ? { "x-convite": convite } : {},
      });
      if (!r.headers.get("content-type")?.includes("application/json"))
        throw Error("A lista de viajantes está indisponível no momento.");
      const dados = await r.json();
      if (!ativa) return;
      if (!r.ok) throw Error(dados.message);
      setLista(dados);
      if (convite)
        history.replaceState(null, "", location.pathname + location.search);
    }
    carregar().catch((e) => ativa && setAviso(e.message));
    return () => {
      ativa = false;
    };
  }, [acesso]);
  const [conviteJuan, setConviteJuan] = useState("");
  async function entrar() {
    setBusy(true);
    setAviso("");
    try {
      if (foto && foto.size > 15 * 1024 * 1024)
        throw Error("Escolha uma foto de até 15 MB.");
      const r = await fetch("/api/perfil?vaga=" + vaga, {
        method: "POST",
        body: foto,
        headers: pessoa?.exigeConvite ? { "x-convite": conviteJuan.trim().split("#convite=").pop() ?? "" } : {},
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.message);
      if (foto && ["/", "/entrar"].includes(location.pathname)) history.replaceState(null, "", "/album");
      if (data.primeiroPerfil) primeiroPerfil(data.primeiroPerfil);
      const auth = await db.auth.verifyOtp({
        type: "magiclink",
        token_hash: data.token_hash,
      });
      if (auth.error) throw Error("Não foi possível entrar. Tente novamente.");
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Falha ao entrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="entrada-viajante">
      <header className="capa-entrada">
        <h1><img src="/ohana-capa.webp" alt="OHANA · おはな" /></h1>
      </header>
      <section>
        {acesso ? <>
          <h2>Acessar meu perfil</h2>
          <button className="acao-perfil" disabled={busy} onClick={abrirPerfil}>Entrar neste celular</button>
          <button disabled={busy} onClick={() => { setAcesso(null); setAviso(""); }}>Voltar para a lista</button>
        </> : <>
        <h2>Quem é o viajante?</h2>
        <label>
          Seu nome
          <select
            value={vaga}
            onChange={(e) => {
              setVaga(e.target.value);
              setFoto(null);
              setAviso("");
            }}
          >
            <option value="">Selecione seu nome</option>
            {lista.map((p) => (
              <option key={p.vaga} value={p.vaga}>
                {p.nome}
                {p.vaga === 1 ? " · organizador" : ""}
              </option>
            ))}
          </select>
        </label>
        {pessoa?.exigeConvite && <label>Convite pessoal do organizador
          <input type="password" value={conviteJuan} onChange={e => setConviteJuan(e.target.value)} />
        </label>}
        {pessoa && !pessoa.cadastrado && (
          <div className="ohana-revela" key={pessoa.vaga}>
            <h3>Sua foto de perfil</h3>
            <p>
              Ela aparece no seu perfil e ao lado dos seus pontos no ranking.
            </p>
            <FotoPerfil arquivo={foto} escolher={setFoto} />
          </div>
        )}
        {pessoa && (
          <button
            className="acao-perfil"
            disabled={busy || (pessoa.exigeConvite && !conviteJuan.trim()) || (!foto && !pessoa.cadastrado)}
            onClick={entrar}
          >
            {busy ? "Entrando…" : "Entrar na viagem"}
          </button>
        )}
        </>}
        <p role="status">{aviso}</p>
      </section>
    </div>
  );
}
