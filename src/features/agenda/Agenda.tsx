import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Temporal } from "@js-temporal/polyfill";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { db, type Viagem } from "../acesso/client";

type Atividade = {
  id: string;
  titulo: string;
  inicio: string;
  termino: string | null;
  local: string;
  observacao: string;
  cancelada: boolean;
};
const localDate = (instant: string, zone: string) =>
  Temporal.Instant.from(instant).toZonedDateTimeISO(zone).toPlainDateTime();
const dataHora = (iso: string, fuso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  }).format(new Date(iso));
const hora = (iso: string, fuso: string) =>
  localDate(iso, fuso).toPlainTime().toString({ smallestUnit: "minute" });

export function Agenda({ viagem, admin }: { viagem: Viagem; admin: boolean }) {
  const [rows, setRows] = useState<Atividade[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [erro, setErro] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [dia, setDia] = useState(() => {
    const today = Temporal.Now.plainDateISO(viagem.fuso).toString();
    return today < viagem.inicio
      ? viagem.inicio
      : today > viagem.fim
        ? viagem.fim
        : today;
  });
  const [editor, setEditor] = useState<Atividade | "nova" | null>(null);
  const request = useRef(0);
  const reload = useCallback(async () => {
    const n = ++request.current;
    const { data, error } = await db
      .from("atividades")
      .select("*")
      .eq("viagem_id", viagem.id)
      .order("inicio")
      .order("id");
    if (request.current !== n) return;
    setErro(Boolean(error));
    if (data) setRows(data);
    setLoaded(true);
    setNow(Date.now());
  }, [viagem.id]);
  useEffect(() => {
    void reload();
    const visible = () => {
      if (!document.hidden) void reload();
    };
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => {
      request.current++;
      clearInterval(timer);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [reload]);
  const proxima = rows.find((a) => !a.cancelada && Date.parse(a.inicio) > now);
  const lista = rows.filter(
    (a) => localDate(a.inicio, viagem.fuso).toPlainDate().toString() === dia,
  );
  const days = [];
  const primeiroDia = Temporal.PlainDate.from(viagem.inicio);
  const duracao =
    primeiroDia.until(Temporal.PlainDate.from(viagem.fim)).days + 1;
  if (duracao <= 31)
    for (let i = 0; i < duracao; i++) days.push(primeiroDia.add({ days: i }));
  if (editor && admin)
    return (
      <Formulario
        key={editor === "nova" ? "nova" : editor.id}
        atividade={editor === "nova" ? null : editor}
        dia={dia}
        viagem={viagem}
        fechar={() => setEditor(null)}
        salvo={async (d) => {
          setDia(d);
          setEditor(null);
          await reload();
        }}
      />
    );
  return (
    <section className="agenda">
      <h2>Agenda da viagem</h2>
      {erro ? (
        <p role="alert">
          Não foi possível atualizar a agenda.{" "}
          <button onClick={reload}>Tentar novamente</button>
        </p>
      ) : !loaded ? (
        <p>Carregando atividades…</p>
      ) : (
        <>
          {proxima && (
            <div className="proxima">
              <small>
                <Clock3 size={15} />
                Próxima atividade
              </small>
              <h3>{proxima.titulo}</h3>
              <span>
                {dataHora(proxima.inicio, viagem.fuso)}
                {proxima.local && " · " + proxima.local}
              </span>
            </div>
          )}
          {duracao > 31 ? (
            <label>
              Dia da viagem
              <input
                type="date"
                min={viagem.inicio}
                max={viagem.fim}
                value={dia}
                onChange={(e) => {
                  if (e.target.validity.valid && e.target.value)
                    setDia(e.target.value);
                }}
              />
            </label>
          ) : (
            <div className="agenda-dias" aria-label="Dias da viagem">
              {days.map((d) => (
                <button
                  key={d.toString()}
                  aria-label={d.toLocaleString("pt-BR", {
                    day: "numeric",
                    month: "long",
                  })}
                  aria-pressed={d.toString() === dia}
                  onClick={() => setDia(d.toString())}
                >
                  {d.toLocaleString("pt-BR", { weekday: "short" })}
                  <strong>{d.day}</strong>
                </button>
              ))}
            </div>
          )}
          <h3>
            {Temporal.PlainDate.from(dia).toLocaleString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          {lista.length === 0 ? (
            <p className="empty">Dia livre na praia.</p>
          ) : (
            lista.map((a) => (
              <article key={a.id}>
                <CalendarDays aria-hidden="true" />
                <div>
                  <small>
                    {hora(a.inicio, viagem.fuso)}
                    {a.termino && " — " + dataHora(a.termino, viagem.fuso)}
                  </small>
                  <h3>{a.titulo}</h3>
                  {a.cancelada && <strong>Cancelada</strong>}
                  {a.local && (
                    <span className="location">
                      <MapPin size={14} />
                      {a.local}
                    </span>
                  )}
                  {a.observacao && <p>{a.observacao}</p>}
                  {admin && !a.cancelada && (
                    <button onClick={() => setEditor(a)}>Editar</button>
                  )}
                </div>
              </article>
            ))
          )}
          {admin && (
            <button onClick={() => setEditor("nova")}>
              Adicionar atividade
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Formulario({
  atividade: a,
  dia,
  viagem: v,
  fechar,
  salvo,
}: {
  atividade: Atividade | null;
  dia: string;
  viagem: Viagem;
  fechar: () => void;
  salvo: (dia: string) => Promise<void>;
}) {
  const [id] = useState(() => a?.id ?? crypto.randomUUID());
  const [aviso, setAviso] = useState(""),
    [busy, setBusy] = useState(false);
  const value = (iso: string) =>
    localDate(iso, v.fuso).toString({ smallestUnit: "minute" });
  async function gravar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const get = (k: string) => String(fields.get(k) ?? "").trim();
    const inicio = get("inicio"),
      fim = get("termino"),
      titulo = get("titulo");
    setBusy(true);
    try {
      const instante = (s: string) =>
        Temporal.PlainDateTime.from(s)
          .toZonedDateTime(v.fuso, { disambiguation: "reject" })
          .toInstant()
          .toString();
      const dados = {
        titulo,
        inicio: instante(inicio),
        termino: fim ? instante(fim) : null,
        local: get("local"),
        observacao: get("observacao"),
      };
      if (!titulo) throw Error("Preencha o título.");
      if (
        dados.termino &&
        Date.parse(dados.termino) <= Date.parse(dados.inicio)
      )
        throw Error("O término deve ser posterior ao início.");
      const tabela = db.from("atividades");
      const r = await (
        a
          ? tabela.update(dados).eq("id", id).eq("cancelada", false)
          : tabela.insert({ ...dados, id, viagem_id: v.id })
      )
        .select("id")
        .single();
      if (r.error)
        throw Error(
          "Não foi possível salvar. Confira os dados e atualize a agenda.",
        );
      await salvo(inicio.slice(0, 10));
    } catch (err) {
      setAviso(
        err instanceof RangeError
          ? "Horário inválido no fuso do destino."
          : err instanceof Error
            ? err.message
            : "Falha ao salvar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function cancelar() {
    if (!window.confirm("Cancelar esta atividade e mantê-la no histórico?"))
      return;
    setBusy(true);
    const r = await db
      .from("atividades")
      .update({ cancelada: true })
      .eq("id", id)
      .select("id")
      .single();
    if (r.error) setAviso("Não foi possível cancelar. Tente novamente.");
    else await salvo(dia);
    setBusy(false);
  }
  return (
    <section>
      <h2>{a ? "Editar atividade" : "Adicionar atividade"}</h2>
      <p>Horários no fuso {v.fuso}.</p>
      <form onSubmit={gravar}>
        <label>
          Título
          <input name="titulo" required defaultValue={a?.titulo} />
        </label>
        <label>
          Início
          <input
            type="datetime-local"
            name="inicio"
            required
            min={v.inicio + "T00:00"}
            max={v.fim + "T23:59"}
            defaultValue={a ? value(a.inicio) : dia + "T09:00"}
          />
        </label>
        <label>
          Término (opcional)
          <input
            type="datetime-local"
            name="termino"
            defaultValue={a?.termino ? value(a.termino) : ""}
          />
        </label>
        <label>
          Local
          <input name="local" defaultValue={a?.local} />
        </label>
        <label>
          Observação
          <textarea name="observacao" defaultValue={a?.observacao} />
        </label>
        {aviso && <p role="alert">{aviso}</p>}
        <button disabled={busy}>Salvar atividade</button>
        <button disabled={busy} type="button" onClick={fechar}>
          Voltar à agenda
        </button>
        {a && (
          <button disabled={busy} type="button" onClick={cancelar}>
            Cancelar atividade
          </button>
        )}
      </form>
    </section>
  );
}
