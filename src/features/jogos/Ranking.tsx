import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Trophy } from "lucide-react";
import { db, type Pessoa } from "../acesso/client";
import { Rodada } from "./Rodada";

type Resultado = {
  id: string;
  jogo: string;
  titulo: string;
  criada_em: string;
  pontos: Record<number, number>;
  correcoes: {
    id: number;
    vaga: number;
    autor: string;
    anterior: number;
    novo: number;
    instante: string;
  }[];
};
export function classificar(pessoas: Pessoa[], rodadas: Resultado[]) {
  const lista = pessoas
    .map((p) => ({
      ...p,
      total: rodadas.reduce((s, r) => s + (r.pontos[p.vaga] ?? 0), 0),
    }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.nome.localeCompare(b.nome, "pt-BR") ||
        a.vaga - b.vaga,
    );
  return lista.map((p) => ({
    ...p,
    posicao: lista.findIndex((outro) => outro.total === p.total) + 1,
  }));
}

export function Ranking({
  pessoas,
  eu,
  fuso,
}: {
  pessoas: Pessoa[];
  eu: Pessoa | undefined;
  fuso: string;
}) {
  const [rows, setRows] = useState<Resultado[] | null>(null),
    [erro, setErro] = useState(""),
    [status, setStatus] = useState("");
  const [nova, setNova] = useState(false);
  const [edicao, setEdicao] = useState<{
    rodada: string;
    vaga: number;
    anterior: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const n = ++seq.current;
    const { data, error } = await db.rpc("historico_jogos");
    if (n !== seq.current) return;
    if (error) setErro("Não foi possível atualizar os resultados.");
    else {
      setRows(data);
      setErro("");
    }
  }, []);
  useEffect(() => {
    void reload();
    const refresh = () => {
      if (!document.hidden) void reload();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      seq.current++;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);
  const nome = (vaga: number) =>
    pessoas.find((p) => p.vaga === vaga)?.nome ?? "Participante";
  const data = (s: string) =>
    new Date(s).toLocaleString("pt-BR", {
      timeZone: fuso,
      dateStyle: "short",
      timeStyle: "short",
    });
  async function corrigir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edicao) return;
    const novo = Number(new FormData(e.currentTarget).get("pontos"));
    setBusy(true);
    const { error } = await db.rpc("corrigir_pontos", {
      rodada: edicao.rodada,
      jogador: edicao.vaga,
      esperado: edicao.anterior,
      novo_valor: novo,
    });
    setBusy(false);
    setEdicao(null);
    await reload();
    setStatus(
      error
        ? "A correção não foi salva. Confira o resultado atual e tente de novo."
        : "Pontuação corrigida.",
    );
  }
  if (nova)
    return (
      <Rodada
        pessoas={pessoas}
        jogos={[...new Set(rows?.map((r) => r.jogo))]}
        fechar={() => setNova(false)}
        salvo={() => {
          setNova(false);
          setStatus("Rodada registrada.");
          void reload();
        }}
      />
    );
  return (
    <section className="ranking">
      <header className="panel blue">
        <Trophy aria-hidden="true" />
        <h2>Ranking dos jogos</h2>
        {eu?.vaga === 1 && (
          <button
            onClick={() => {
              setStatus("");
              setNova(true);
            }}
          >
            Lançar rodada
          </button>
        )}
      </header>
      {erro && (
        <p role="alert">
          {erro} <button onClick={reload}>Tentar novamente</button>
        </p>
      )}
      <p role="status">{status}</p>
      {rows === null ? (
        !erro && <p>Carregando resultados…</p>
      ) : (
        <>
          {rows.length === 0 && <p>O primeiro jogo ainda vai começar.</p>}
          <ol aria-label="Classificação">
            {classificar(pessoas, rows).map((p) => (
              <li key={p.vaga}>
                <b>{p.posicao}º</b>
                {p.avatar?<img className="avatar-ranking" src={p.avatar} alt={'Foto de '+p.nome}/>:<span className="avatar-ranking iniciais" aria-hidden="true">{p.nome.slice(0,1)}</span>}
                <strong>
                  {p.nome}
                  {p.vaga === eu?.vaga ? " · Você" : ""}
                </strong>
                <span>{p.total} pts</span>
              </li>
            ))}
          </ol>
          <h2>Histórico de rodadas</h2>
          {rows.map((r) => (
            <details key={r.id}>
              <summary>
                {r.jogo} · {r.titulo}
              </summary>
              <small>{data(r.criada_em)}</small>
              {Object.entries(r.pontos).map(([k, valor]) => {
                const vaga = Number(k);
                return (
                  <div className="resultado" key={k}>
                    <p>
                      {nome(vaga)} · {valor} pts
                    </p>
                    {edicao?.rodada === r.id && edicao.vaga === vaga ? (
                      <form onSubmit={corrigir}>
                        <label>
                          Novo valor para {nome(vaga)}
                          <input
                            name="pontos"
                            required
                            type="number"
                            min="0"
                            max="2147483647"
                            step="1"
                            defaultValue={edicao.anterior}
                          />
                        </label>
                        <button disabled={busy}>Salvar correção</button>
                        <button
                          disabled={busy}
                          type="button"
                          onClick={() => setEdicao(null)}
                        >
                          Voltar
                        </button>
                      </form>
                    ) : (
                      eu?.vaga === 1 && (
                        <button
                          aria-label={"Corrigir pontos de " + nome(vaga)}
                          onClick={() =>
                            setEdicao({ rodada: r.id, vaga, anterior: valor })
                          }
                        >
                          Corrigir
                        </button>
                      )
                    )}
                  </div>
                );
              })}
              {r.correcoes.length > 0 && (
                <>
                  <h3>Correções</h3>
                  {r.correcoes.map((c) => (
                    <p key={c.id}>
                      {nome(c.vaga)} · {c.anterior} → {c.novo} pts
                      <br />
                      <small>
                        {pessoas.find((p) => p.usuario_id === c.autor)?.nome ??
                          "Organizador"}{" "}
                        · {data(c.instante)}
                      </small>
                    </p>
                  ))}
                </>
              )}
            </details>
          ))}
        </>
      )}
    </section>
  );
}
