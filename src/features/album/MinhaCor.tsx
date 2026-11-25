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
  const seq = useRef(0);
  const [fotos, setFotos] = useState<VagaFoto[]>([]);
  const [editando, setEditando] = useState<VagaFoto | null>(null);
  const carregar = useCallback(async () => {
    const n = ++seq.current;
    const { data, error } = await db.rpc("missao_album");
    let detalhes: VagaFoto[] = [];
    if (data) {
      try {
        const [proprias, grupo] = await Promise.all([
          data.cor ? apiFotos<VagaFoto[]>() : Promise.resolve([]),
          apiFotos<VagaFoto[]>("?colecao=familia"),
        ]);
        detalhes = proprias;
        if (n === seq.current) setCompartilhadas(grupo);
      } catch {
        if (seq.current === n)
          setErro("Não foi possível carregar as fotos. Tente atualizar.");
        return;
      }
    }
    if (seq.current !== n) return;
    if (error || !data) setErro("Não foi possível consultar o álbum.");
    else {
      setMissao(data);
      setFotos(detalhes);
      setErro("");
    }
  }, []);
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
  const grade = familia ? compartilhadas : fotos;
  return (
    <section className="missao caderno-pagina">
      <header className="capa">
        <small>Nosso álbum</small>
        <h1>9 Momentos de Cores</h1>
        <p>Nossas cores, nossas histórias.</p>
      </header>
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
      {!missao ? (
        <p>Carregando álbum…</p>
      ) : (
        <>
          {!familia && !missao.cor ? (
            <div className="sorteio">
              <h2>Sua cor</h2>
              <p>Confirme sua foto de perfil para receber uma cor.</p>
              <a href="/perfil">Abrir meu perfil</a>
            </div>
          ) : (
            <>
              <header className="colecao-titulo">
                <h3>
                  {!familia && <i className="gota" />}
                  {familia ? "Fotos da família" : "Sua cor: " + missao.cor?.nome}
                </h3>
                <small>
                  {familia
                    ? compartilhadas.length + ` de ${pessoas.length * 9} fotos`
                    : fotos.filter((v) => v.foto).length +
                      " de 9 fotos enviadas"}
                </small>
              </header>
              <ol className="grid mosaico">
                {grade.map((v) => (
                  <li key={chave(v)}>
                    <button
                      className="quadro"
                      aria-label={
                        familia
                          ? "Ver foto de " +
                            nome(v.vaga) +
                            ", posição " +
                            v.posicao
                          : "Abrir foto " + v.posicao + " de 9"
                      }
                      onClick={() =>
                        familia ? setAberta(chave(v)) : setEditando(v)
                      }
                    >
                      <span
                        className={
                          "janela " + (v.mini ? "ocupada" : "pendente")
                        }
                      >
                        {v.mini ? (
                          <img src={v.mini} alt="" loading="lazy" />
                        ) : (
                          <CameraPlus size={27} strokeWidth={1.1} />
                        )}
                      </span>
                      <span className="legenda">
                        {v.legenda || "Foto " + v.posicao + " de 9"}
                      </span>
                      <small>
                        {familia ? nome(v.vaga) : v.mini ? "" : "Aguardando"}
                      </small>
                    </button>
                  </li>
                ))}
              </ol>
              {familia && !grade.length && (
                <div className="sorteio">
                  <Images size={32} />
                  <p>A primeira foto da família vai aparecer aqui.</p>
                </div>
              )}
              {!familia && <p className="dica-cor">{missao.cor?.sugestao}</p>}
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
