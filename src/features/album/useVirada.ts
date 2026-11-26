import { useEffect, useRef, useState, type RefObject, type PointerEvent } from "react";

// O índice só muda quando a folha assenta. Durante o gesto, apenas a camada de papel se move.
export function useVirada(memoria: RefObject<number>) {
  const livro = useRef<HTMLDivElement>(null);
  const [pagina, setPagina] = useState(memoria.current);
  const progresso = useRef(0);
  const quadro = useRef(0);
  const bloquearClique = useRef(false);
  const gesto = useRef<{
    id: number; x: number; y: number; largura: number; inicio: number;
    arrastando: boolean; ultimoX: number; instante: number; velocidade: number;
  } | null>(null);
  const direcao = pagina === 1 ? 1 : -1;
  const reduzido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function desenhar(valor: number) {
    progresso.current = Math.max(0, Math.min(1, valor));
    const el = livro.current;
    if (!el) return;
    el.style.setProperty("--giro", (reduzido() ? 0 : direcao * progresso.current * 90) + "deg");
    el.style.setProperty("--sombra", String(reduzido() ? 0 : Math.sin(Math.PI * progresso.current) * .45));
  }
  function assentar(avancar: boolean) {
    cancelAnimationFrame(quadro.current);
    const de = progresso.current;
    const para = avancar ? 1 : 0;
    const inicio = performance.now();
    const duracao = reduzido() ? 0 : 240 * Math.abs(para - de);
    function animar(agora: number) {
      const t = duracao ? Math.min(1, (agora-inicio)/duracao) : 1;
      if (t < 1) {
        desenhar(de + (para-de) * (1-Math.pow(1-t,3)));
        quadro.current = requestAnimationFrame(animar);
      } else {
        if (avancar) {
          memoria.current = pagina === 1 ? 2 : 1;
          setPagina(memoria.current);
        }
        desenhar(0);
        quadro.current = 0;
      }
    }
    quadro.current = requestAnimationFrame(animar);
  }
  useEffect(() => {
    function interromper() {
      cancelAnimationFrame(quadro.current);
      gesto.current = null;
      progresso.current = 0;
      livro.current?.style.removeProperty("--giro");
      livro.current?.style.removeProperty("--sombra");
    }
    window.addEventListener("blur", interromper);
    window.addEventListener("orientationchange", interromper);
    return () => {
      window.removeEventListener("blur", interromper);
      window.removeEventListener("orientationchange", interromper);
      cancelAnimationFrame(quadro.current);
    };
  }, []);
  function iniciar(e: PointerEvent<HTMLDivElement>) {
    if (!e.isPrimary || e.button !== 0) return;
    cancelAnimationFrame(quadro.current);
    bloquearClique.current = false;
    gesto.current = { id:e.pointerId, x:e.clientX, y:e.clientY, largura:e.currentTarget.clientWidth,
      inicio:progresso.current, arrastando:false, ultimoX:e.clientX, instante:e.timeStamp, velocidade:0 };
  }
  function mover(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX-g.x;
    if (!g.arrastando) {
      const dy = Math.abs(e.clientY-g.y);
      if (dy > 9 && dy > Math.abs(dx)) { cancelar(); return; }
      if (Math.abs(dx) < 10 || Math.abs(dx) <= dy) return;
      g.arrastando = true;
      bloquearClique.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    g.velocidade = direcao * (e.clientX-g.ultimoX)/Math.max(1,e.timeStamp-g.instante);
    g.ultimoX = e.clientX;
    g.instante = e.timeStamp;
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => desenhar(g.inicio + direcao*dx/g.largura));
  }
  function cancelar() {
    gesto.current = null;
    assentar(false);
  }
  function soltar(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    gesto.current = null;
    if (!g.arrastando) { if (progresso.current) assentar(progresso.current >= .5); return; }
    cancelAnimationFrame(quadro.current);
    desenhar(g.inicio + direcao*(e.clientX-g.x)/g.largura);
    const p = progresso.current;
    const rapido = e.timeStamp-g.instante < 80 && g.velocidade > .55;
    assentar(p >= .35 || (p >= .12 && rapido));
  }
  return { livro, pagina, virar: () => assentar(true), eventos: {
    onPointerDown: iniciar, onPointerMove: mover, onPointerUp: soltar,
    onPointerCancel: cancelar, onLostPointerCapture: (e: PointerEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && gesto.current?.arrastando) cancelar();
    },
    onClickCapture: (e: { detail:number; preventDefault():void; stopPropagation():void }) => {
      if (bloquearClique.current && e.detail) { e.preventDefault(); e.stopPropagation(); }
    },
  }};
}
