import { useState } from "react";
import { db, type Pessoa } from "./client";
import { LinkAcesso } from "./LinkAcesso";
import { FotoPerfil } from "./FotoPerfil";
export function Perfil({
  pessoa,
  reload,
}: {
  pessoa: Pessoa;
  reload: () => Promise<void>;
}) {
  const [foto, setFoto] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  async function salvar() {
    setBusy(true);
    try {
      if (!foto || foto.size > 15 * 1024 * 1024)
        throw Error("Escolha uma foto de até 15 MB.");
      const { data } = await db.auth.getSession();
      const r = await fetch("/api/perfil", {
        method: "POST",
        headers: { Authorization: "Bearer " + data.session?.access_token },
        body: foto,
      });
      if (!r.ok) throw Error((await r.json()).message);
      await reload();
      setFoto(null);
      setMsg("Foto de perfil atualizada.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="perfil-viajante">
      <small>Meu perfil</small>
      <h1>{pessoa.nome}</h1>
      <FotoPerfil foto={pessoa.avatar} arquivo={foto} escolher={setFoto} />
      {foto && (
        <button className="acao-perfil" disabled={busy} onClick={salvar}>
          Salvar foto
        </button>
      )}
      <p role="status">{msg}</p>
      <LinkAcesso pessoa={pessoa} />
    </section>
  );
}
