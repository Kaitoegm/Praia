import { UserRound } from "lucide-react";
import { arteDaCor, cores } from "./cores";
import { LivroAlbum } from "./LivroAlbum";
import { flushSync } from "react-dom";
import { chavesDosRascunhos } from "./rascunhos";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Images,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import "./album.css";
import { db, type Pessoa } from "../acesso/client";
import { apiFotos, type VagaFoto } from "./fotos";
import { lazy, Suspense } from "react";
const EnviarFoto = lazy(() => import("./EnviarFoto").then(m => ({default:m.EnviarFoto})));

type Missao = {
  cor: null | { nome: string; amostra: string; sugestao: string };
  vagas: { posicao: number; confirmada: boolean }[];
  colecoes: {
    nome: string;
    cor: string;
    amostra: string;
    quantidade: number;
  }[];
};
export function MinhaCor({
  usuario,
  pessoas,
  minhaVaga,
}: {
  usuario: string;
  pessoas: Pessoa[];
  minhaVaga: number;
}) {
  const [missao, setMissao] = useState<Missao | null>(null),
    [erro, setErro] = useState("");
  const [familia, setFamilia] = useState(
    new URLSearchParams(location.search).has("familia"),
  );
  const [aberta, setAberta] = useState<string | null>(null);
  const [compartilhadas, setCompartilhadas] = useState<VagaFoto[]>([]);
  const [familiaCarregada, setFamiliaCarregada] = useState(false);

  const seq = useRef(0);
  const paginaPessoal = useRef(1);
  const paginaFamilia = useRef(1);
  const [recadoAviso, setRecadoAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [recadoSalvar, setRecadoSalvar] = useState("");
  const fotoDoAviso = useRef(new URLSearchParams(location.search).get("foto"));
  const camera = useRef<HTMLInputElement>(null);
  const [rascunhos, setRascunhos] = useState<IDBValidKey[]>([]);
  const [fotos, setFotos] = useState<VagaFoto[]>([]);
  const [editando, setEditando] = useState<VagaFoto | null>(null);
  const carregar = useCallback(async () => {
    const n = ++seq.current;
    try {
      if (familia) {
        const [grupo, inicial] = await Promise.all([
          apiFotos<VagaFoto[]>("?colecao=familia"),
          db.rpc("missao_album"),
        ]);
        if (seq.current !== n) return;
        if (inicial?.data) {
          setMissao(inicial.data);

        }
        if (fotoDoAviso.current) {
          const alvo = grupo.find(f => f.vaga + "-" + f.posicao === fotoDoAviso.current);
          const [vaga, posicao] = fotoDoAviso.current.split("-").map(Number);
          const dono = pessoas.find(p => p.vaga === vaga);
          const cor = alvo?.cor ?? inicial.data?.colecoes?.find((c: Missao["colecoes"][number]) => c.nome === dono?.nome)?.cor;
          const capitulo = cores.findIndex(([nome]) => nome === cor);
          const moldura = cor && arteDaCor(cor)?.quadros[posicao - 1];
          if (capitulo >= 0 && moldura) paginaFamilia.current = capitulo * 2 + moldura.pagina;
          if (alvo?.foto) setAberta(fotoDoAviso.current);
          else setRecadoAviso("Esta foto foi removida do álbum.");
          fotoDoAviso.current = null;
        }
        setCompartilhadas(grupo);
        setFamiliaCarregada(true);
      } else {
        const [res, proprias, pendentes] = await Promise.all([
          db.rpc("missao_album"),
          apiFotos<VagaFoto[]>(),
          chavesDosRascunhos(usuario).catch(() => []),
        ]);
        if (seq.current !== n) return;
        if (res.error || !res.data) throw Error();
        setMissao(res.data);

        setFotos(proprias);
        setRascunhos(pendentes);
      }
      setErro("");
    } catch {
      if (seq.current === n) setErro("Não foi possível carregar as fotos. Tente atualizar.");
    }
  }, [usuario, familia, pessoas]);
  useEffect(() => {
    void carregar();
    const atualizar = () => {
      if (!document.hidden) void carregar();
    };
    window.addEventListener("focus", atualizar);
    window.addEventListener("album-atualizado", atualizar);
    const timer = setInterval(atualizar, 600000);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      seq.current++;
      clearInterval(timer);
      window.removeEventListener("album-atualizado", atualizar);
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [carregar]);
  const [recemPublicada, setRecemPublicada] = useState<number>();
  useEffect(() => {
    if (recemPublicada === undefined || editando) return;
    const timer = window.setTimeout(() => setRecemPublicada(undefined), 300);
    return () => window.clearTimeout(timer);
  }, [recemPublicada, editando]);
  async function voltar() {
    await carregar();
    setEditando(null);
  }
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".shell");
    shell?.classList.add("caderno");
    shell?.style.setProperty("--tinta", missao?.cor?.amostra ?? "#bca98b");
    return () => {
      shell?.classList.remove("caderno");
      shell?.style.removeProperty("--tinta");
    };
  }, [missao?.cor?.amostra]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (aberta && !dialog.current?.open) dialog.current?.showModal();
  }, [aberta]);
  if (editando && missao?.cor)
    return (
      <Suspense fallback={<p>Preparando câmera…</p>}><EnviarFoto
        camera={camera}
        chaveRascunho={usuario + ":" + editando.posicao}
        vaga={editando}
        cor={missao.cor.nome}
        voltar={voltar}
        concluir={publicou => {
          if (publicou) setRecemPublicada(editando.posicao);
          return voltar();
        }}
      /></Suspense>
    );
  const chave = (f: VagaFoto) => f.vaga + "-" + f.posicao;
  const nome = (v: number) =>
    pessoas.find((p) => p.vaga === v)?.nome ?? "Familiar";
  const indice = compartilhadas.findIndex((f) => chave(f) === aberta),
    ampliada = compartilhadas[indice];
  function abrir(v: VagaFoto) {
    if (familia) return setAberta(chave(v));
    if (v.foto || rascunhos.includes(usuario + ":" + v.posicao)) return setEditando(v);
    flushSync(() => setEditando(v));
  }
  return (
    <section className="missao caderno-pagina">
      <div className="album-abas">
        <button data-guia="minha-cor" aria-pressed={!familia} onClick={() => setFamilia(false)}>
          <Camera size={16} /> Minha cor
        </button>
        <button data-guia="da-familia" aria-pressed={familia} onClick={() => setFamilia(true)}>
          <Images size={16} /> Da família
        </button>
      </div>
      {!familia && missao?.cor && (
        <header className="postal-cor">
          <h1><span>Sua cor é</span> {missao.cor.nome}</h1>
          <img src="/selo-orla.webp" width="92" height="95" alt="" />
        </header>
      )}
      {familia && recadoAviso && <p role="status">{recadoAviso}</p>}
      {erro && (
        <p role="alert">
          {erro} <button onClick={carregar}>Atualizar</button>
        </p>
      )}
      {(familia ? !familiaCarregada : !missao) ? (
        <p>Carregando álbum…</p>
      ) : (
        <>
          {!familia && !missao?.cor ? (
            <div className="sorteio">
              <h2>Sua cor</h2>
              <p>Confirme sua foto de perfil para receber uma cor.</p>
              <a href="/perfil" className="botao-ohana"><UserRound size={17} aria-hidden="true"/> Abrir meu perfil</a>
            </div>
          ) : (
            <>
              {!familia && <header className="colecao-titulo">
                <h3>Minha coleção</h3>
                <small>
                  {fotos.filter(v => v.foto).length} de 9 fotos enviadas
                </small>
              </header>}
              <LivroAlbum key={familia ? "familia" : "pessoal"} corPessoal={missao?.cor?.nome ?? ""}
                memoria={familia ? paginaFamilia : paginaPessoal} familia={familia}
                recemPublicada={familia ? undefined : recemPublicada} pessoas={pessoas} donos={missao?.colecoes} fotos={familia ? compartilhadas : fotos} abrir={abrir} />
              {familia && !compartilhadas.length && (
                <div className="sorteio">
                  <Images size={32} />
                  <p>A primeira foto da família vai aparecer aqui.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
      {ampliada && (
        <dialog
          ref={dialog}
          className="ampliada"
          onCancel={() => setAberta(null)}
          aria-label="Foto ampliada"
        >
          <button
            autoFocus
            aria-label="Fechar foto"
            onClick={() => setAberta(null)}
          >
            <X />
          </button>
          <img
            src={ampliada.foto!}
            alt={ampliada.legenda || "Foto de " + nome(ampliada.vaga)}
          />
          <h3>{ampliada.legenda}</h3>
          <p>
            {nome(ampliada.vaga)}
            {ampliada.vaga === minhaVaga ? " · Você" : ""}
          </p>
          <button className="botao-ohana botao-ohana--secundario" disabled={salvando} onClick={async () => {
            setSalvando(true);
            setRecadoSalvar("");
            try {
              const r = await fetch(ampliada.foto!);
              if (!r.ok) throw Error();
              const arquivo = new File([await r.blob()], `ohana-${ampliada.vaga}-${ampliada.posicao}.jpg`, {type:"image/jpeg"});
              if (navigator.canShare?.({files:[arquivo]})) {
                try {
                  await navigator.share({files:[arquivo]});
                  return;
                } catch (e) {
                  if (!(e instanceof DOMException && e.name === "NotAllowedError")) throw e;
                }
              }
              const url = URL.createObjectURL(arquivo);
              const link = document.createElement("a");
              link.href = url;
              link.download = arquivo.name;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 30000);
              setRecadoSalvar("Download solicitado.");
            } catch (e) {
              if (!(e instanceof DOMException && e.name === "AbortError"))
                setRecadoSalvar("Não foi possível salvar a foto. Tente novamente.");
            } finally { setSalvando(false); }
          }}>{salvando ? "Preparando foto…" : "Salvar foto"}</button>
          <p role="status">{recadoSalvar}</p>
          <footer>
            <button
              disabled={indice === 0}
              onClick={() => setAberta(chave(compartilhadas[indice - 1]))}
            >
              <ChevronLeft />
              Anterior
            </button>
            <button
              disabled={indice === compartilhadas.length - 1}
              onClick={() => setAberta(chave(compartilhadas[indice + 1]))}
            >
              Próxima
              <ChevronRight />
            </button>
          </footer>
        </dialog>
      )}
    </section>
  );
}
