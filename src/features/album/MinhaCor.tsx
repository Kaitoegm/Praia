import { cores } from "./cores";
import { LivroAlbum } from "./LivroAlbum";
import { flushSync } from "react-dom";
import { chavesDosRascunhos } from "./rascunhos";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus as CameraPlus,
  Images,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import "./album.css";
import { db, type Pessoa } from "../acesso/client";
import { apiFotos, type VagaFoto } from "./fotos";
import { EnviarFoto } from "./EnviarFoto";

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
          const capitulo = cores.findIndex(([cor]) => cor === alvo?.cor);
          if (alvo && capitulo >= 0) {
            paginaFamilia.current = capitulo * 2 + (alvo.posicao > 4 ? 2 : 1);
            setAberta(fotoDoAviso.current);
          }
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
  }, [usuario, familia]);
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
      <EnviarFoto
        camera={camera}
        chaveRascunho={usuario + ":" + editando.posicao}
        vaga={editando}
        cor={missao.cor.nome}
        voltar={voltar}
        concluir={voltar}
      />
    );
  const chave = (f: VagaFoto) => f.vaga + "-" + f.posicao;
  const nome = (v: number) =>
    pessoas.find((p) => p.vaga === v)?.nome ?? "Familiar";
  const indice = compartilhadas.findIndex((f) => chave(f) === aberta),
    ampliada = compartilhadas[indice];
  const marinho = "Azul-marinho";
  function abrir(v: VagaFoto) {
    if (familia) return setAberta(chave(v));
    if (v.foto || rascunhos.includes(usuario + ":" + v.posicao)) return setEditando(v);
    flushSync(() => setEditando(v));
    if (missao?.cor?.nome !== marinho) camera.current?.click();
  }
  return (
    <section className="missao caderno-pagina">
      {!familia && missao?.cor ? (
        <header className="postal-cor">
          <h1><span>Sua cor é</span> {missao.cor.nome}</h1>
          <img src="/selo-orla.webp" width="92" height="95" alt="" />
        </header>
      ) : (
        <header className="capa">
          <small>Nosso álbum</small>
          <h1>9 Momentos de Cores</h1>
        </header>
      )}
      <div className="album-abas">
        <button aria-pressed={!familia} onClick={() => setFamilia(false)}>
          <Camera size={16} /> Minha cor
        </button>
        <button aria-pressed={familia} onClick={() => setFamilia(true)}>
          <Images size={16} /> Da família
        </button>
      </div>
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
              <a href="/perfil">Abrir meu perfil</a>
            </div>
          ) : (
            <>
              <header className="colecao-titulo">
                <h3>
                  {familia ? "Fotos da família" : "Minha coleção"}
                </h3>
                <small>
                  {familia
                    ? compartilhadas.length + ` de ${pessoas.length * 9} fotos`
                    : fotos.filter((v) => v.foto).length +
                      " de 9 fotos enviadas"}
                </small>
              </header>
              {(familia || missao?.cor?.nome === marinho) && <LivroAlbum key={familia ? "familia" : "pessoal"} memoria={familia ? paginaFamilia : paginaPessoal} familia={familia} donos={missao?.colecoes} fotos={familia ? compartilhadas : fotos} abrir={abrir} />}
              {(!familia && missao?.cor?.nome !== marinho) && <ol className="grid mosaico">
                {fotos.map((v) => (
                  <li key={chave(v)}>
                    <button
                      className="quadro"
                      aria-label={`Abrir foto ${v.posicao} de 9`}
                      onClick={() => abrir(v)}
                    >
                      <span
                        className={
                          "janela " + (v.mini ? "ocupada" : "pendente")
                        }
                      >
                        {v.mini ? (
                          <img src={v.mini} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <CameraPlus size={27} strokeWidth={1.1} />
                        )}
                      </span>
                      <span className="legenda">
                        {v.legenda || "Foto " + v.posicao + " de 9"}
                      </span>
                      <small>
                        {v.mini ? "" : "Aguardando"}
                      </small>
                    </button>
                  </li>
                ))}
              </ol>}
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
