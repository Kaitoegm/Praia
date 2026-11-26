import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { CalendarDays, Camera, Trophy, UserRound } from "lucide-react";
import { Marca } from "../../app/Marca";
import { Perfil } from "./Perfil";
import { db, type Pessoa, type Viagem } from "./client";
import { Entrada } from "./Entrada";
import { Ranking } from "../jogos/Ranking";
import { MinhaCor } from "../album/MinhaCor";
import { Avisos } from "../album/Avisos";
import { ConfigurarViagem } from "../viagem/ConfigurarViagem";

import { RoletaCor } from "./RoletaCor";

const Agenda = lazy(() => import("../agenda/Agenda").then(m => ({ default: m.Agenda })));

export function ViagemPrivada() {
  const [sorteio, setSorteio] = useState<string | null>(() => sessionStorage.getItem("ohana-primeira-cor"));
  function primeiroPerfil(id: string) {
    sessionStorage.setItem("ohana-primeira-cor", id);
    setSorteio(id);
  }
  function continuar() {
    sessionStorage.removeItem("ohana-primeira-cor");
    setSorteio(null);
  }
  const [identidade, setIdentidade] = useState<string | null | undefined>(
    undefined,
  );
  useEffect(() => {
    const { data } = db.auth.onAuthStateChange((_event, s) =>
      setIdentidade(s?.user.id ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (identidade && location.pathname === "/entrar")
      location.replace("/agenda");
  }, [identidade]);
  return (
    <div className="shell">
      <div className="brand">
        <Marca />
        {identidade && <Avisos key={identidade} id={identidade} />}
      </div>
      {identidade === undefined ? (
        <main>Carregando…</main>
      ) : identidade && sorteio === identidade ? (
        <RoletaCor continuar={continuar} />
      ) : identidade ? (
        <Area key={identidade} id={identidade} />
      ) : (
        <main>
          <Entrada primeiroPerfil={primeiroPerfil} />
        </main>
      )}
    </div>
  );
}
function Area({ id }: { id: string }) {
  const [viagem, setViagem] = useState<Viagem | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [erro, setErro] = useState(false);
  const [url, setUrl] = useState(() => location.pathname + location.search);
  const [visita, setVisita] = useState(0);
  const ultimaConsulta = useRef(0);
  const consultaAtual = useRef(0);
  const principal = useRef<HTMLElement>(null);
  useEffect(() => {
    const voltar = () => setUrl(location.pathname + location.search);
    window.addEventListener("popstate", voltar);
    return () => window.removeEventListener("popstate", voltar);
  }, []);
  async function reload() {
    const consulta = ++consultaAtual.current;
    ultimaConsulta.current = Date.now();
    const [v, p] = await Promise.all([
      db.from("viagens").select("*").single(),
      db
        .from("participantes")
        .select("vaga,nome,avatar,usuario_id")
        .order("vaga"),
    ]);
    if (consulta !== consultaAtual.current) return;
    setErro(Boolean(v.error || p.error));
    setViagem(v.data);
    setPessoas(p.data ?? []);
  }
  useEffect(() => {
    void reload();
    const atualizar = () => {
      if (!document.hidden) void reload();
    };
    document.addEventListener('visibilitychange', atualizar);
    return () => document.removeEventListener('visibilitychange', atualizar);
  }, []);
  const eu = pessoas.find((p) => p.usuario_id === id);
  const rota = url.split("?")[0];
  const path = rota === "/jogos" ? "/ranking" : rota;
  const abas = [
    { path: "/agenda", label: "Agenda", Icon: CalendarDays },
    { path: "/ranking", label: "Jogos", Icon: Trophy },
    { path: "/album", label: "Álbum", Icon: Camera },
    { path: "/perfil", label: "Perfil", Icon: UserRound },
  ];
  return (
    <>
      <main key={visita} ref={principal} tabIndex={-1}>
        {erro ? (
          <p>
            Não foi possível abrir sua viagem.{" "}
            <button onClick={reload}>Tentar novamente</button>
          </p>
        ) : !viagem ? (
          <p>Carregando viagem…</p>
        ) : path === "/perfil" && eu ? (
          <Perfil pessoa={eu} reload={reload} />
        ) : path === "/configurar" && eu?.vaga === 1 ? (
          <ConfigurarViagem viagem={viagem} pessoas={pessoas} reload={reload} />
        ) : (
          <>
            {path === "/agenda" || path === "/" ? (
              <Suspense fallback={<p>Carregando agenda…</p>}><Agenda viagem={viagem} admin={eu?.vaga === 1} /></Suspense>
            ) : path === "/ranking" ? (
              <Ranking pessoas={pessoas} eu={eu} fuso={viagem.fuso} />
            ) : path === "/album" ? (
              <MinhaCor
                usuario={id}
                pessoas={pessoas}
                minhaVaga={eu?.vaga ?? 0}
              />
            ) : (
              <section>
                <h2>{abas.find((a) => a.path === path)?.label ?? "Agenda"}</h2>
                <p className="empty">Página indisponível.</p>
              </section>
            )}
            {eu?.vaga === 1 && <a href="/configurar">Configurar viagem</a>}
          </>
        )}
      </main>
      <nav aria-label="Navegação principal">
        {abas.map(({ path: href, label, Icon }) => (
          <a
            href={href}
            onClick={event => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              if (location.pathname === href) setVisita(n => n + 1);
              if (location.pathname + location.search !== href) history.pushState(null, "", href);
              setUrl(href);
              if (Date.now() - ultimaConsulta.current > 30000) void reload();
              principal.current?.focus({ preventScroll: true });
              window.scrollTo(0, 0);
            }}
            key={href}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon size={21} />
            {label}
          </a>
        ))}
      </nav>
    </>
  );
}
