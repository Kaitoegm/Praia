import { useState } from "react";
import { db, type Pessoa } from "../acesso/client";

export function Rodada({
  pessoas,
  jogos,
  fechar,
  salvo,
}: {
  pessoas: Pessoa[];
  jogos: string[];
  fechar: () => void;
  salvo: () => void;
}) {
  const [jogo, setJogo] = useState(""),
    [titulo, setTitulo] = useState("");
  const [valores, setValores] = useState<Record<number, string>>({});
  const [revisao, setRevisao] = useState(false),
    [busy, setBusy] = useState(false),
    [erro, setErro] = useState("");
  const [chave] = useState(() => crypto.randomUUID());
  const [vagaAtual, setVagaAtual] = useState(pessoas[0]?.vaga);
  const jogadores = pessoas.filter((p) => p.vaga in valores);
  async function confirmar() {
    setBusy(true);
    setErro("");
    const { error } = await db.rpc("salvar_rodada", {
      jogo: jogo.trim(),
      titulo: titulo.trim(),
      pontuacoes: Object.fromEntries(
        jogadores.map((p) => [p.vaga, Number(valores[p.vaga])]),
      ),
      chave_operacao: chave,
    });
    setBusy(false);
    if (error)
      setErro(
        "Não foi possível confirmar a rodada. Confira a conexão e tente novamente.",
      );
    else salvo();
  }
  return (
    <section>
      <h2>{revisao ? "Revisar resultado" : "Lançar rodada"}</h2>
      {revisao ? (
        <>
          <h3>
            {jogo} · {titulo}
          </h3>
          <ol className="resumo-pontos ohana-revela">
            {jogadores.map((p) => (
              <li key={p.vaga}>
                {p.nome}
                <span>{valores[p.vaga]} pts</span>
              </li>
            ))}
          </ol>
          <p>
            Total da rodada:{" "}
            {jogadores.reduce((s, p) => s + Number(valores[p.vaga]), 0)} pontos
          </p>
          <button disabled={busy} onClick={confirmar}>
            Confirmar resultado
          </button>{" "}
          <button disabled={busy} onClick={() => setRevisao(false)}>
            Voltar para editar
          </button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!jogadores.length || !jogo.trim() || !titulo.trim()) {
              setErro("Informe jogo, rodada e ao menos um jogador.");
              return;
            }
            const incompleto = jogadores.find(p => !valores[p.vaga].trim() || !Number.isInteger(Number(valores[p.vaga])) || Number(valores[p.vaga]) < 0 || Number(valores[p.vaga]) > 2147483647);
            if (incompleto) {
              setVagaAtual(incompleto.vaga);
              setErro("Confira os pontos de " + incompleto.nome + ".");
              return;
            }
            setErro("");
            setRevisao(true);
          }}
        >
          <label>
            Jogo
            <input
              required
              list="nomes-jogos"
              value={jogo}
              onChange={(e) => setJogo(e.target.value)}
              placeholder="Ex.: Vôlei de areia"
            />
          </label>
          <datalist id="nomes-jogos">
            {jogos.map((j) => (
              <option key={j} value={j} />
            ))}
          </datalist>
          <label>
            Nome da rodada
            <input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </label>
          <fieldset>
            <legend>Quem jogou?</legend>
            {pessoas.length > 2 && <label>Selecionar participante
              <select value={vagaAtual} onChange={e => setVagaAtual(Number(e.target.value))}>
                {pessoas.map(p => <option key={p.vaga} value={p.vaga}>{p.nome}{p.vaga in valores ? " · " + (valores[p.vaga] || "…") + " pts" : ""}</option>)}
              </select>
            </label>}
            {pessoas.filter(p => pessoas.length <= 2 || p.vaga === vagaAtual).map((p) => (
              <div key={p.vaga}>
                <label className="jogador">
                  <input
                    type="checkbox"
                    checked={p.vaga in valores}
                    onChange={(e) => {
                      const next = { ...valores };
                      if (e.target.checked) next[p.vaga] = "";
                      else delete next[p.vaga];
                      setValores(next);
                    }}
                  />
                  {p.nome}
                </label>
                {p.vaga in valores && (
                  <label>
                    Pontos de {p.nome}
                    <input
                      required
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      max="2147483647"
                      value={valores[p.vaga]}
                      onChange={(e) =>
                        setValores({ ...valores, [p.vaga]: e.target.value })
                      }
                    />
                  </label>
                )}
              </div>
            ))}
          </fieldset>
          <button>Revisar resultado</button>
          <button type="button" onClick={fechar}>
            Cancelar lançamento
          </button>
        </form>
      )}
      {erro && <p role="alert">{erro}</p>}
    </section>
  );
}
