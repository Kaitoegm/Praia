import { useEffect, type RefObject } from "react";
import { Camera, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useVirada } from "./useVirada";
import { arteDaCor, cores } from "./cores";
import type { Pessoa } from "../acesso/client";
import type { VagaFoto } from "./fotos";

// A faixa externa da ilustração pode preencher o papel; cada abertura continua
// com escala uniforme, inclusive quando está inclinada.
function ajustarArte(arte: ReturnType<typeof arteDaCor>, lado: number) {
  const largura = arte.larguras[lado - 1];
  const altura = arte.altura;
  const proporcao = 4 / 5;
  const quadros = arte.quadros.filter(q => q.pagina === lado);
  let margemX = .15, margemY = .15;
  for (const q of quadros) {
    const a = q.angulo * Math.PI / 180;
    const dx = (Math.abs(Math.cos(a)) * q.w + Math.abs(Math.sin(a)) * q.h) / 2;
    const dy = (Math.abs(Math.sin(a)) * q.w + Math.abs(Math.cos(a)) * q.h) / 2;
    margemX = Math.min(margemX, (Math.min(q.x, largura-q.x) - dx) / largura);
    margemY = Math.min(margemY, (Math.min(q.y, altura-q.y) - dy) / altura);
  }
  // Resguarda um pequeno contorno ao redor das fotos. Aproveita o restante
  // da margem para acomodar ilustrações mais altas ou largas que a folha.
  const x = Math.max(0, margemX - .005);
  const y = Math.max(0, margemY - .005);
  const escala = Math.min(Math.max(proporcao/largura, 1/altura),
    proporcao / (largura * (1-2*x)), 1 / (altura * (1-2*y)));
  const fracX = largura * escala / proporcao;
  const fracY = altura * escala;
  const bordaX = Math.max(0, (1-fracX)/2 + x*fracX);
  const bordaY = Math.max(0, (1-fracY)/2 + y*fracY);
  return { fracX, fracY, fatias: `${100*y}% ${100*x}% fill`,
    bordas: `${100*bordaY}% ${100*bordaX}%` };
}

export function LivroAlbum({ fotos, abrir, familia, memoria, donos, pessoas, corPessoal }: {
  corPessoal: string;
  fotos: VagaFoto[];
  abrir: (foto: VagaFoto) => void;
  familia: boolean;
  memoria: RefObject<number>;
  pessoas: Pessoa[];
  donos?: { nome: string; cor: string }[];
}) {
  const sentidoAvanco = familia ? -1 : 1;
  const total = familia ? cores.length * 2 : 2;
  const { livro, folha, sombra, pagina, virar, irPara, eventos } = useVirada(memoria, total, sentidoAvanco);
  useEffect(() => {
    // As vizinhas já estão montadas. Antecipe a decodificação antes do próximo gesto.
    const vizinhas = livro.current?.querySelectorAll<HTMLImageElement>('[data-ativa="false"] img');
    vizinhas?.forEach(img => { void img.decode().catch(() => {}); });
  }, [livro, pagina, fotos]);
  const capitulo = Math.floor((pagina - 1) / 2);
  const [corAtual, tinta] = familia ? cores[capitulo] : [corPessoal, ""];
  const dono = donos?.find(d => d.cor === corAtual);
  const responsavel = pessoas.find(p => p.nome === dono?.nome)
    ?? pessoas.find(p => p.vaga === fotos.find(f => f.cor === corAtual)?.vaga);
  const nome = responsavel?.nome ?? dono?.nome;
  return <section className="livro-album" aria-label={familia ? "Livro da família" : `Álbum ${corPessoal}`}>
    {familia && <div className="ficha-capitulo">
      {responsavel?.avatar
        ? <img className="retrato-capitulo" src={responsavel.avatar} alt={`Foto de ${nome}`} width="38" height="38"/>
        : <span aria-hidden="true" className="retrato-capitulo inicial-capitulo">{nome?.slice(0,1) || "–"}</span>}
      <div className="identidade-capitulo">
        <h1><i aria-hidden="true" style={{backgroundColor:tinta}}/>{corAtual}</h1>
        <span>{nome ?? "Aguardando sorteio"}</span>
      </div>
      <span className="total-capitulo">{fotos.filter(f=>f.cor===corAtual && f.foto).length}/9 fotos</span>
      <ChevronDown size={18} aria-hidden="true" />
      <select aria-label="Capítulo" value={capitulo} onChange={e => irPara(Number(e.target.value)*2+1)}>
        {cores.map(([cor],i) => {
          const autor = donos?.find(c => c.cor === cor);
          return <option key={cor} value={i}>{cor}{autor ? " · " + autor.nome : ""}</option>;
        })}
      </select>
    </div>}
    <div className="palco-album">
    <div className="marinho-livro" ref={livro} {...eventos}>
      {[pagina-1,pagina,pagina+1].filter(n=>n>=1 && n<=total).map(n => {
        const lado = n % 2 === 1 ? 1 : 2;
        const cor = familia ? cores[Math.floor((n-1)/2)][0] : corPessoal;
        const arte = arteDaCor(cor);
        const largura = arte.larguras[lado-1];
        const ajuste = ajustarArte(arte, lado);
        const colecao = familia ? fotos.filter(f => f.cor === cor) : fotos;
        return <div className="marinho-folha" ref={n === pagina ? folha : undefined} data-ativa={n === pagina}
          data-vizinha={(n-pagina) * sentidoAvanco} inert={n !== pagina} key={n} aria-label={`Página ${n}`}>
          <div className="arte-pagina">
            {arte.quadros.map((m, i) => {
              if (m.pagina !== lado) return null;
              const foto = colecao.find(f => f.posicao === i + 1);
              return <button key={i} className="marinho-foto"
                style={{left: (0.5 + (m.x/largura - 0.5)*ajuste.fracX) * 100 + "%", top: (0.5 + (m.y/arte.altura - 0.5)*ajuste.fracY) * 100 + "%",
                  width: (m.w + 8) / largura * ajuste.fracX * 100 + "%", height: (m.h + 8) / arte.altura * ajuste.fracY * 100 + "%",
                  transform: `translate(-50%, -50%) rotate(${m.angulo}deg)`}}
                disabled={!foto || (familia && !foto.foto)}
                aria-label={!familia ? `Abrir foto ${i+1} de 9` : foto?.legenda || `Ver foto ${i+1} de ${cor}`}
                onClick={() => foto && abrir(foto)}>
                {foto?.mini ? <img src={foto.mini} alt="" draggable={false} decoding="async" /> : !familia && <Camera size={20}/>}
              </button>;
            })}
            <div className="marinho-arte" aria-hidden="true" style={{
              borderImageSource: `url("/album/${cor.toLowerCase()}/${lado}.webp")`,
              borderImageSlice: ajuste.fatias, borderImageWidth: ajuste.bordas,
            }}/>
          </div>
          <span className="marinho-sombra" ref={n === pagina ? sombra : undefined} aria-hidden="true" />
        </div>;
      })}
    </div>
    </div>
    <div className="marinho-controles">
      <button disabled={pagina===1} onClick={()=>virar(-1)} aria-label="Página anterior">{familia ? <ChevronLeft/> : <ChevronRight/>}</button>
      <span aria-live="polite">Página {pagina} de {total}</span>
      <button disabled={pagina===total} onClick={()=>virar(1)} aria-label="Próxima página">{familia ? <ChevronRight/> : <ChevronLeft/>}</button>
    </div>
  </section>;
}
