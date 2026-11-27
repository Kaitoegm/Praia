import { useState, type FormEvent } from "react";
import { db, type Viagem, type Pessoa } from "../acesso/client";


export function ConfigurarViagem({
  viagem,
  pessoas,
  reload,
}: {
  viagem: Viagem;
  pessoas: Pessoa[];
  reload: () => Promise<void>;
}) {
  const [participante, setParticipante] = useState("");
  const pessoa = pessoas.find(p => String(p.vaga) === participante);
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true);
    try {
      const result = await db
        .from("viagens")
        .update(data)
        .eq("id", viagem.id)
        .select()
        .single();
      if (result.error) throw result.error;

      await reload();
      setAviso("Viagem atualizada.");
    } catch {
      setAviso("Confira os dados e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Configurar viagem</h1>
      <details className="ajustes-viagem">
      <summary>Dados da viagem</summary>
      <form onSubmit={(e) => salvar(e)}>
        {(["nome", "inicio", "fim", "fuso"] as const).map((key, i) => (
          <label key={key}>
            {["Nome da viagem", "Início", "Fim", "Fuso do destino"][i]}
            <input
              required
              name={key}
              type={i === 1 || i === 2 ? "date" : "text"}
              defaultValue={viagem[key]}
            />
          </label>
        ))}
        <button disabled={busy}>Salvar viagem</button>
      </form>
      </details>
      <a href="/ranking?nova">Registrar pontos de um jogo</a>
      <section>
        <h2>Participantes · {pessoas.filter((p) => p.usuario_id).length}/{pessoas.length}</h2>
        <label>Consultar participante
          <select value={participante} onChange={e => setParticipante(e.target.value)}>
            <option value="">Escolha um nome</option>
            {pessoas.map(p => <option key={p.vaga} value={p.vaga}>{p.nome}</option>)}
          </select>
        </label>
        {pessoa && <p>{pessoa.vaga === 1 ? "Organizador" : pessoa.usuario_id ? "Cadastrado" : "Cadastro pendente"}</p>}
      </section>
      <p role="status">{aviso}</p>
    </>
  );
}
