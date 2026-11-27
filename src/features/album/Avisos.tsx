import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight, X } from "lucide-react";
import { db } from "../acesso/client";
import { apiFotos } from "./fotos";

type Aviso = { id: number; autor: string; vaga: number; posicao: number; arquivo: string | null };
function linkFoto(a?: Aviso) {
  return a ? `/album?familia=1&foto=${a.vaga}-${a.posicao}` : "/album?familia=1";
}
export function Avisos({ id }: { id: string }) {
  const [lista, setLista] = useState<Aviso[]>([]),
    [aberto, setAberto] = useState(false),
    [toast, setToast] = useState(""),
    [nota, setNota] = useState(""),
    [ativando, setAtivando] = useState(false);
  const chave = "praia-avisos-" + id;
  const [lido, setLido] = useState(() => Number(localStorage.getItem(chave)));
  const ultimo = useRef<number | null>(null);
  useEffect(() => {
    let ativo = true,
      ocupado = false;
    async function atualizar() {
      if (ocupado || document.hidden) return;
      ocupado = true;
      try {
        let consulta = db
          .from("avisos_album")
          .select("id,autor,arquivo,vaga,posicao")
          .order("id", { ascending: false })
          .limit(50);
        if (ultimo.current !== null) consulta = consulta.gt("id", ultimo.current);
        const { data } = await consulta;
        if (!ativo || !data) return;
        if (ultimo.current !== null && !data.length) return;
        const recente = data[0]?.id ?? 0;
        if (ultimo.current !== null && recente > ultimo.current) {
          const novas = data.filter((a) => a.id > ultimo.current! && a.arquivo);
          if (novas.length)
            setToast(
              novas.length === 1
                ? novas[0].autor + " adicionou uma foto."
                : novas.length + " fotos novas no álbum.",
            );
          window.dispatchEvent(new Event("album-atualizado"));
        }
        ultimo.current = recente;
        setLista(anterior => [...data, ...anterior].slice(0, 50));
      } finally {
        ocupado = false;
      }
    }
    void atualizar();
    const t = setInterval(atualizar, 2200);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      ativo = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 7000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const publicados = lista.filter(a => a.arquivo);
  function abrir() {
    setAberto(!aberto);
    if (publicados.length) {
      setLido(publicados[0].id);
      localStorage.setItem(chave, String(publicados[0].id));
    }
  }
  useEffect(() => {
    if (!aberto || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") {
      setNota("Avisos bloqueados neste aparelho.");
      return;
    }
    let ativo = true;
    navigator.serviceWorker.getRegistration()
      .then(reg => reg?.pushManager.getSubscription())
      .then(sub => { if (ativo) setNota(sub && localStorage.getItem("ohana-push-perfil") === id ? "Avisos ativos neste aparelho." : "Avisos desativados neste aparelho."); })
      .catch(() => {});
    return () => { ativo = false; };
  }, [aberto, id]);
  async function ativar() {
    setAtivando(true);
    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setNota(
          "Neste navegador, acompanhe os avisos aqui. No iPhone, abra o site pela Tela de Início.",
        );
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") {
        setNota(Notification.permission === "denied"
          ? "As notificações estão bloqueadas. Permita os avisos do OHANA nas configurações do aparelho ou navegador."
          : "Você pode ativar os avisos neste sino quando quiser.");
        return;
      }
      await navigator.serviceWorker.register("/avisos-sw.js");
      const reg = await navigator.serviceWorker.ready;
      const { chave } = await apiFotos<{ chave: string }>("?acao=push");
      const key = Uint8Array.from(
        atob(chave.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      );
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      await apiFotos("?acao=push", JSON.stringify(sub));
      localStorage.setItem("ohana-push-perfil", id);
      setNota("Notificações ativadas neste aparelho.");
    } catch {
      setNota(
        "Não foi possível ativar os avisos neste aparelho. Tente novamente.",
      );
    } finally {
      setAtivando(false);
    }
  }
  return (
    <aside className="avisos">
      <button
        className="sino"
        aria-label="Notificações"
        aria-expanded={aberto}
        onClick={abrir}
      >
        <Bell key={toast || "sino"} className={toast ? "ohana-sino-novo" : undefined} size={19} aria-hidden="true"/>
        {publicados.some((a) => a.id > lido) && <i />}
      </button>
      {aberto && (
        <div className="caixa-avisos">
          <header>
            <h2>Notificações</h2>
            <button
              aria-label="Fechar notificações"
              onClick={() => setAberto(false)}
            >
              <X size={18} />
            </button>
          </header>
          <button disabled={ativando} onClick={ativar}>{ativando ? "Ativando…" : "Ativar no aparelho"}</button>
          <p role="status">{nota}</p>
          {publicados.length === 0 ? (
            <p>As novas fotos da família aparecem aqui.</p>
          ) : (
            publicados.map((a) => (
              <a key={a.id} href={linkFoto(a)}>
                <span>{a.autor} adicionou uma foto.</span><ChevronRight size={16} aria-hidden="true"/>
              </a>
            ))
          )}
        </div>
      )}
      {toast && (
        <a className="toast-album" role="status" href={linkFoto(publicados[0])}>
          <Bell size={16} />
          {toast}
        </a>
      )}
    </aside>
  );
}
