import { useEffect, useState } from "react";
import { db } from "./client";
import { FotoPerfil } from "./FotoPerfil";
type Opcao = { vaga: number; nome: string; disponivel: boolean; meu: boolean };
export function Entrada({ primeiroPerfil }: { primeiroPerfil: (id: string) => void }) {
  const [lista, setLista] = useState<Opcao[]>([]),
    [vaga, setVaga] = useState(""),
    [foto, setFoto] = useState<File | null>(null),
    [aviso, setAviso] = useState(""),
    [busy, setBusy] = useState(false);
  const [credencial, setCredencial] = useState("");
  const pessoa = lista.find((p) => String(p.vaga) === vaga);
  useEffect(() => {
    let ativa = true;
    async function carregar() {
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
      const meu = dados.find((p: Opcao) => p.meu);
      if (meu) setVaga(String(meu.vaga));
      if (convite)
        history.replaceState(null, "", location.pathname + location.search);
    }
    carregar().catch((e) => ativa && setAviso(e.message));
    return () => {
      ativa = false;
    };
  }, []);
  async function confirmarJuan() {
    const token = credencial.trim().replace(/^.*#convite=/, "");
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setAviso("Cole o convite pessoal do Juan completo.");
      return;
    }
    setBusy(true);
    try {
      const resposta = await fetch("/api/perfil", { headers: { "x-convite": token } });
      if (!resposta.ok) throw Error();
      const opcoes: Opcao[] = await resposta.json();
      if (!opcoes.some(p => p.vaga === 1 && p.disponivel)) throw Error();
      setLista(opcoes);
      setCredencial("");
      setAviso("");
    } catch {
      setAviso("Não foi possível confirmar o convite pessoal do Juan.");
    } finally {
      setBusy(false);
    }
  }
  async function entrar() {
    setBusy(true);
    setAviso("");
    try {
      if (foto && foto.size > 15 * 1024 * 1024)
        throw Error("Escolha uma foto de até 15 MB.");
      const r = await fetch("/api/perfil?vaga=" + vaga, {
        method: "POST",
        body: foto,
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
              <option key={p.vaga} value={p.vaga} disabled={!p.disponivel && p.vaga !== 1}>
                {p.nome}
                {p.vaga === 1 ? " · organizador" : !p.disponivel ? " · reservado" : ""}
              </option>
            ))}
          </select>
        </label>
        {pessoa?.vaga === 1 && !pessoa.disponivel && (
          <>
            <label>Convite pessoal do Juan
              <input type="password" value={credencial} autoComplete="off"
                onChange={e => setCredencial(e.target.value)} />
            </label>
            <button disabled={busy || !credencial.trim()} onClick={confirmarJuan}>Confirmar meu acesso</button>
          </>
        )}
        {pessoa?.disponivel && !pessoa.meu && (
          <>
            <h3>Sua foto de perfil</h3>
            <p>
              Ela aparece no seu perfil e ao lado dos seus pontos no ranking.
            </p>
            <FotoPerfil arquivo={foto} escolher={setFoto} />
          </>
        )}
        {pessoa?.disponivel && (
          <button
            className="acao-perfil"
            disabled={busy || (!foto && !pessoa.meu)}
            onClick={entrar}
          >
            {busy ? "Entrando…" : "Entrar na viagem"}
          </button>
        )}
        {location.hostname === "ferias-ohana.vercel.app" && lista.some(p => !p.disponivel) && !lista.some(p => p.meu) && (
          <p><a href="https://praia-six.vercel.app/api/perfil?recuperar">Já entrei no site antigo neste celular</a></p>
        )}
        <p role="status">{aviso}</p>
      </section>
    </div>
  );
}
