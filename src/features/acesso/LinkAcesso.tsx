import { useState } from "react";
import { db, type Pessoa } from "./client";

export function LinkAcesso({ pessoa }: { pessoa: Pessoa }) {
  const [link, setLink] = useState("");
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  async function gerar() {
    setBusy(true);
    setAviso("");
    try {
      const { data } = await db.auth.getSession();
      const resposta = await fetch("/api/perfil?acao=acesso&vaga=" + pessoa.vaga, {
        method: "POST", headers: { Authorization: "Bearer " + data.session?.access_token },
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw Error(resultado.message);
      setLink(location.origin + "/entrar#acesso=" + encodeURIComponent(resultado.token_hash));
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setAviso("Link copiado.");
    } catch {
      setAviso("Toque no campo do link e selecione Copiar.");
    }
  }
  return <section>
    <h2>Acessar em outro celular</h2>
    <p>Este link pessoal abre o perfil de {pessoa.nome} uma vez. Envie apenas para o aparelho de quem usa esse perfil.</p>
    <button className="acao-perfil" onClick={gerar} disabled={busy}>{busy ? "Gerando…" : "Gerar link de acesso"}</button>
    {link && <>
      <label>Link pessoal<input readOnly value={link} onFocus={e => e.target.select()} /></label>
      <button onClick={copiar}>Copiar link</button>
    </>}
    <p role="status">{aviso}</p>
  </section>;
}
