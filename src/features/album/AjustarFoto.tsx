import { useEffect, useRef, useState } from "react";
import { apiFotos } from "./fotos";
import type { Corte } from "./corte";

const limitar = (v: number) => Math.min(1, Math.max(0, v));

export function AjustarFoto({ arquivo, url, proporcao, corte, alterar, fechar }: {
  arquivo: File; url: string; proporcao: number; corte: Corte;
  alterar: (valor: Corte) => void; fechar: () => void;
}) {
  const [fonte, setFonte] = useState(url);
  const [aspecto, setAspecto] = useState(0);
  const [converter, setConverter] = useState(false);
  const [erro, setErro] = useState(false);
  const gesto = useRef<{id:number; x:number; y:number; dx:number; dy:number; inicio:Corte} | null>(null);
  useEffect(() => {
    if (!converter) return;
    let ativo = true;
    apiFotos<{imagem: string}>("?acao=visualizar", arquivo)
      .then(r => { if (ativo) setFonte(r.imagem); })
      .catch(() => { if (ativo) setErro(true); });
    return () => { ativo = false; };
  }, [arquivo, converter]);
  const largura = Math.max(1, aspecto / proporcao) * corte.zoom;
  const altura = Math.max(1, proporcao / (aspecto || proporcao)) * corte.zoom;
  return <div className="editor-corte">
    <div className="janela-corte" tabIndex={0} role="group" aria-label="Posição da foto. Use as setas para mover."
      style={{aspectRatio:proporcao, width:`min(100%, ${38 * proporcao}dvh)`}}
      onKeyDown={e => {
        const teclas: Record<string, [number,number]> = {ArrowLeft:[.05,0], ArrowRight:[-.05,0], ArrowUp:[0,.05], ArrowDown:[0,-.05]};
        const passo = teclas[e.key];
        if (!passo) return;
        e.preventDefault();
        alterar({...corte,x:limitar(corte.x + passo[0]),y:limitar(corte.y + passo[1])});
      }}
      onPointerDown={e => {
        if (!e.isPrimary || !aspecto) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        gesto.current = {id:e.pointerId,x:e.clientX,y:e.clientY, inicio:corte,
          dx:e.currentTarget.clientWidth*(largura-1),dy:e.currentTarget.clientHeight*(altura-1)};
      }}
      onPointerMove={e => {
        const g = gesto.current;
        if (g?.id !== e.pointerId) return;
        alterar({...g.inicio,x:g.dx ? limitar(g.inicio.x-(e.clientX-g.x)/g.dx) : g.inicio.x,
          y:g.dy ? limitar(g.inicio.y-(e.clientY-g.y)/g.dy) : g.inicio.y});
      }}
      onLostPointerCapture={()=>{gesto.current=null;}}>
      <img src={fonte} draggable={false} alt="Enquadramento da foto" onLoad={e=>setAspecto(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight)}
        onError={()=>converter ? setErro(true) : setConverter(true)}
        style={{width:largura*100+"%",height:altura*100+"%",left:corte.x*100+"%",top:corte.y*100+"%",
          transform:`translate(${-100*corte.x}%, ${-100*corte.y}%)`}} />
    </div>
    {!aspecto && <p role="status">{erro ? "Não foi possível abrir a prévia. Confira a conexão e tente novamente." : "Abrindo a foto…"}</p>}
    <label>Zoom · {corte.zoom.toFixed(1)}×
      <input type="range" min="1" max="4" step=".05" disabled={!aspecto} value={corte.zoom}
        onChange={e=>alterar({...corte,zoom:Number(e.target.value)})} />
    </label>
    <button onClick={fechar}>Concluir ajuste</button>
  </div>;
}
