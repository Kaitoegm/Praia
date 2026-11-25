import { useEffect, useState } from "react";
import { CalendarDays, Camera, Trophy, UserRound } from "lucide-react";
import { Marca } from "../../app/Marca";
import { Perfil } from "./Perfil";
import { db, type Pessoa, type Viagem } from "./client";
import { Entrada } from "./Entrada";
import { Agenda } from "../agenda/Agenda";
import { Ranking } from "../jogos/Ranking";
import { MinhaCor } from "../album/MinhaCor";
import { Avisos } from "../album/Avisos";
import { ConfigurarViagem } from "../viagem/ConfigurarViagem";

export function ViagemPrivada() {
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
      ) : identidade ? (
        <Area key={identidade} id={identidade} />
      ) : (
        <main>
          <Entrada />
        </main>
      )}
    </div>
  );
}
function Area({ id }: { id: string }) {
  const [viagem, setViagem] = useState<Viagem | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [erro, setErro] = useState(false);
  async function reload() {
    const [v, p] = await Promise.all([
      db.from("viagens").select("*").single(),
      db
        .from("participantes")
        .select("vaga,nome,avatar,usuario_id")
        .order("vaga"),
    ]);
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
  const path = location.pathname;
  const abas = [
    { path: "/agenda", label: "Agenda", Icon: CalendarDays },
    { path: "/jogos", label: "Jogos", Icon: Trophy },
    { path: "/album", label: "Álbum", Icon: Camera },
    { path: "/perfil", label: "Perfil", Icon: UserRound },
  ];
  return (
    <>
      <main>
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
            {path !== "/album" && (
              <header className="hero">
                <div>
                  <h1>{viagem.nome}</h1>
                  <span>
                    {[viagem.inicio, viagem.fim]
                      .map((d) => d.split("-").reverse().join("/"))
                      .join(" — ")}
                  </span>
                </div>
              </header>
            )}
            {path === "/agenda" || path === "/" ? (
              <Agenda viagem={viagem} admin={eu?.vaga === 1} />
            ) : path === "/jogos" ? (
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
        <p>
          <button
            onClick={async () => {
              try {
                const registro =
                  await navigator.serviceWorker?.getRegistration();
                const sub = await registro?.pushManager?.getSubscription();
                await sub?.unsubscribe();
              } finally {
                await db.auth.signOut({ scope: "local" });
              }
            }}
          >
            Sair da conta
          </button>
        </p>
      </main>
      <nav aria-label="Navegação principal">
        {abas.map(({ path: href, label, Icon }) => (
          <a
            href={href}
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
