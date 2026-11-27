import type { RefObject } from "react";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { useVirada } from "./useVirada";
import { arteDaCor, cores } from "./cores";
import type { VagaFoto } from "./fotos";

export function LivroAlbum({ fotos, abrir, familia, memoria, donos, corPessoal }: {
  corPessoal: string;
  fotos: VagaFoto[];
  abrir: (foto: VagaFoto) => void;
  familia: boolean;
  memoria: RefObject<number>;
  donos?: { nome: string; cor: string }[];
}) {
  const sentidoAvanco = familia ? -1 : 1;
  const total = familia ? cores.length * 2 : 2;
  const { livro, folha, sombra, pagina, virar, irPara, eventos } = useVirada(memoria, total, sentidoAvanco);
  const capitulo = Math.floor((pagina - 1) / 2);
  return <section className="livro-album" aria-label={familia ? "Livro da família" : `Álbum ${corPessoal}`}>
    {familia && <label className="indice-album">Capítulo
      <select value={capitulo} onChange={e => irPara(Number(e.target.value)*2+1)}>
        {cores.map(([cor],i) => {
          const dono = donos?.find(c => c.cor === cor);
          return <option key={cor} value={i}>{cor}{dono ? " · " + dono.nome : ""}</option>;
        })}
      </select>
    </label>}
    <div className="marinho-livro" ref={livro} {...eventos}>
      {[pagina-1,pagina,pagina+1].filter(n=>n>=1 && n<=total).map(n => {
        const lado = n % 2 === 1 ? 1 : 2;
        const cor = familia ? cores[Math.floor((n-1)/2)][0] : corPessoal;
        const arte = arteDaCor(cor);
        const largura = arte.larguras[lado-1];
        const colecao = familia ? fotos.filter(f => f.cor === cor) : fotos;
        return <div className="marinho-folha" ref={n === pagina ? folha : undefined} data-ativa={n === pagina}
          data-vizinha={(n-pagina) * sentidoAvanco} inert={n !== pagina} key={n} aria-label={`Página ${n}`}>
          <div className="arte-pagina" style={{width: `min(100%, ${largura / arte.altura * 100}cqh)`,aspectRatio:largura / arte.altura}}>
            {arte.quadros.map((m, i) => {
              if (m.pagina !== lado) return null;
              const foto = colecao.find(f => f.posicao === i + 1);
              return <button key={i} className="marinho-foto"
                style={{left: m.x / largura * 100 + "%", top: m.y / arte.altura * 100 + "%",
                  width: (m.w + 8) / largura * 100 + "%", height: (m.h + 8) / arte.altura * 100 + "%",
                  transform: `translate(-50%, -50%) rotate(${m.angulo}deg)`}}
                disabled={!foto || (familia && !foto.foto)}
                aria-label={!familia ? `Abrir foto ${i+1} de 9` : foto?.legenda || `Ver foto ${i+1} de ${cor}`}
                onClick={() => foto && abrir(foto)}>
                {foto?.mini ? <img src={foto.mini} alt="" draggable={false} decoding="async" /> : !familia && <Camera size={20}/>}
              </button>;
            })}
            <img className="marinho-arte" src={`/album/${cor.toLowerCase()}/${lado}.webp`} width={largura} height={arte.altura} alt="" draggable={false}/>
          </div>
          <span className="marinho-sombra" ref={n === pagina ? sombra : undefined} aria-hidden="true" />
        </div>;
      })}
    </div>
    <div className="marinho-controles">
      <button disabled={pagina===1} onClick={()=>virar(-1)} aria-label="Página anterior">{familia ? <ChevronLeft/> : <ChevronRight/>}</button>
      <span aria-live="polite">Página {pagina} de {total}</span>
      <button disabled={pagina===total} onClick={()=>virar(1)} aria-label="Próxima página">{familia ? <ChevronRight/> : <ChevronLeft/>}</button>
    </div>
  </section>;
}
