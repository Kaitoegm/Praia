import type { RefObject } from "react";
import { useVirada } from "./useVirada";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import molduras from "./molduras-marinho.json";
import type { VagaFoto } from "./fotos";

export function PaginasMarinho({ fotos, abrir, pessoal, memoria }: {
  fotos: VagaFoto[];
  abrir: (foto: VagaFoto) => void;
  pessoal: boolean;
  memoria: RefObject<number>;
}) {
  const { livro, folha, sombra, pagina, virar, eventos } = useVirada(memoria);
  return <section aria-label="Álbum azul-marinho">
    <div className="marinho-livro" ref={livro} data-pagina={pagina} {...eventos}>
      {[1, 2].map(n => <div className="marinho-folha" ref={n === pagina ? folha : undefined} data-ativa={n === pagina} inert={n !== pagina} key={n} aria-label={`Página ${n}`}>
        {molduras.map((m, i) => {
          if (m.pagina !== n) return null;
          const foto = fotos.find(f => f.posicao === i + 1);
          return <button key={i} className="marinho-foto"
            style={{left: m.x / 688 * 100 + "%", top: m.y / 768 * 100 + "%",
              width: (m.w + 8) / 688 * 100 + "%", height: (m.h + 8) / 768 * 100 + "%",
              transform: `translate(-50%, -50%) rotate(${m.angulo}deg)`}}
            disabled={!foto || (!pessoal && !foto.foto)}
            aria-label={pessoal ? `Abrir foto ${i+1} de 9` : foto?.legenda || `Ver foto ${i+1} de Azul-marinho`}
            onClick={() => foto && abrir(foto)}>
            {foto?.mini ? <img src={foto.mini} alt="" draggable={false} decoding="async" /> : pessoal && <Camera size={20}/>}
          </button>;
        })}
        <img className="marinho-arte" src={`/album/azul-marinho/${n}.webp`} width="688" height="768" alt="" draggable={false}/>
        <span className="marinho-sombra" ref={n === pagina ? sombra : undefined} aria-hidden="true" />
      </div>)}
    </div>
    <div className="marinho-controles">
      <button disabled={pagina===1} onClick={virar} aria-label="Página anterior"><ChevronRight/></button>
      <span aria-live="polite">Página {pagina} de 2</span>
      <button disabled={pagina===2} onClick={virar} aria-label="Próxima página"><ChevronLeft/></button>
    </div>
  </section>;
}
