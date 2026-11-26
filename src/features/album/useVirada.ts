import { flushSync } from "react-dom";
import { useEffect, useRef, useState, type RefObject, type PointerEvent } from "react";

// O índice só muda quando a folha assenta. Durante o gesto, apenas a camada de papel se move.
export function useVirada(memoria: RefObject<number>, total: number) {
  const livro = useRef<HTMLDivElement>(null);
  const [pagina, setPagina] = useState(memoria.current);
  const progresso = useRef(0);
  const folha = useRef<HTMLDivElement>(null);
  const sombra = useRef<HTMLSpanElement>(null);
  const quadro = useRef(0);
  const pendente = useRef(0);
  const destino = useRef(false);
  const animacoes = useRef<Animation[]>([]);
  const movimentoReduzido = useRef(false);
  const bloquearClique = useRef(false);
  const gesto = useRef<{
    id: number; x: number; y: number; largura: number; inicio: number;
    retomado: boolean; arrastando: boolean; ultimoX: number; instante: number; velocidade: number;
  } | null>(null);
  const direcao = useRef(1);
  function prepararDirecao(sentido: number) {
    if (pagina + sentido < 1 || pagina + sentido > total) return false;
    direcao.current = sentido;
    if (livro.current) livro.current.dataset.sentido = String(sentido);
    return true;
  }
  function irPara(n: number) {
    cancelAnimationFrame(quadro.current);
    quadro.current = 0;
    gesto.current = null;
    pararAnimacoes();
    progresso.current = 0;
    folha.current?.style.removeProperty("transform");
    sombra.current?.style.removeProperty("opacity");
    memoria.current = n;
    setPagina(n);
  }

  function rotacao(p: number) {
    // A largura projetada é largura * cos(ângulo). Sua borda percorre p * largura.
    return `rotateY(${direcao.current * Math.acos(1-p)}rad)`;
  }
  function desenhar(valor: number) {
    const p = Math.max(0, Math.min(1, valor));
    progresso.current = p;
    if (!movimentoReduzido.current && folha.current && sombra.current) {
      folha.current.style.transform = rotacao(p);
      sombra.current.style.opacity = String(p * .42);
    }
  }
  function pararAnimacoes() {
    for (const a of animacoes.current) a.cancel();
    animacoes.current = [];
  }
  function assentar(avancar: boolean) {
    cancelAnimationFrame(quadro.current);
    quadro.current = 0;
    pararAnimacoes();
    const papel = folha.current;
    const tinta = sombra.current;
    const de = progresso.current;
    const para = avancar ? 1 : 0;
    if (!papel || !tinta) return;
    destino.current = avancar;
    function terminar() {
      if (avancar) {
        memoria.current = pagina + direcao.current;
        flushSync(() => setPagina(memoria.current));
      }
      pararAnimacoes();
      papel!.style.removeProperty("transform");
      tinta!.style.removeProperty("opacity");
      progresso.current = 0;
    }
    if (movimentoReduzido.current || de === para) { terminar(); return; }
    const opcoes = {duration: Math.max(90, 240 * Math.abs(para - de)), easing:"cubic-bezier(.2,.65,.3,1)", fill:"forwards" as const};
    const giro = papel.animate([{transform:rotacao(de)}, {transform:rotacao(para)}], opcoes);
    const luz = tinta.animate([{opacity:de*.42}, {opacity:para*.42}], opcoes);
    animacoes.current = [giro, luz];
    giro.onfinish = () => { if (animacoes.current[0] === giro) terminar(); };
  }
  function atualizarPreferencia() {
    movimentoReduzido.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  useEffect(() => {
    function interromper() {
      cancelAnimationFrame(quadro.current);
      gesto.current = null;
      progresso.current = 0;
      quadro.current = 0;
      pararAnimacoes();
      folha.current?.style.removeProperty("transform");
      sombra.current?.style.removeProperty("opacity");
    }
    window.addEventListener("blur", interromper);
    window.addEventListener("orientationchange", interromper);
    return () => {
      pararAnimacoes();
      window.removeEventListener("blur", interromper);
      window.removeEventListener("orientationchange", interromper);
      cancelAnimationFrame(quadro.current);
    };
  }, []);
  function iniciar(e: PointerEvent<HTMLDivElement>) {
    if (!e.isPrimary || e.button !== 0) return;
    cancelAnimationFrame(quadro.current);
    quadro.current = 0;
    atualizarPreferencia();
    const retomando = animacoes.current.length > 0 && folha.current;
    if (retomando && folha.current) {
      const transform = getComputedStyle(folha.current).transform;
      const p = transform === "none" ? 0 : 1 - new DOMMatrixReadOnly(transform).m11;
      pararAnimacoes();
      desenhar(p);
    }
    bloquearClique.current = Boolean(retomando);
    gesto.current = { id:e.pointerId, x:e.clientX, y:e.clientY, largura:e.currentTarget.clientWidth,
      inicio:progresso.current, retomado:Boolean(retomando), arrastando:false, ultimoX:e.clientX, instante:e.timeStamp, velocidade:0 };
  }
  function mover(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX-g.x;
    if (!g.arrastando) {
      const dy = Math.abs(e.clientY-g.y);
      if (dy > 9 && dy > Math.abs(dx)) { cancelar(); return; }
      if (Math.abs(dx) < 10 || Math.abs(dx) <= dy) return;
      if (!g.retomado && !prepararDirecao(Math.sign(dx))) {
        bloquearClique.current = true;
        gesto.current = null;
        return;
      }
      g.arrastando = true;
      bloquearClique.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    g.velocidade = direcao.current * (e.clientX-g.ultimoX)/Math.max(1,e.timeStamp-g.instante);
    g.ultimoX = e.clientX;
    g.instante = e.timeStamp;
    pendente.current = g.inicio + direcao.current*dx/g.largura;
    if (!quadro.current) quadro.current = requestAnimationFrame(() => {
      quadro.current = 0;
      desenhar(pendente.current);
    });
  }
  function cancelar() {
    gesto.current = null;
    assentar(false);
  }
  function soltar(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    gesto.current = null;
    if (!g.arrastando) { if (g.retomado) assentar(destino.current); return; }
    cancelAnimationFrame(quadro.current);
    desenhar(g.inicio + direcao.current*(e.clientX-g.x)/g.largura);
    const p = progresso.current;
    const rapido = e.timeStamp-g.instante < 80 && g.velocidade > .55;
    assentar(p >= .35 || (p >= .12 && rapido));
  }
  return { livro, folha, sombra, pagina, irPara, virar: (sentido: number) => { atualizarPreferencia(); if (!gesto.current && !animacoes.current.length && prepararDirecao(sentido)) assentar(true); }, eventos: {
    onPointerDown: iniciar, onPointerMove: mover, onPointerUp: soltar,
    onPointerCancel: cancelar, onLostPointerCapture: (e: PointerEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && gesto.current?.arrastando) cancelar();
    },
    onClickCapture: (e: { detail:number; preventDefault():void; stopPropagation():void }) => {
      if (bloquearClique.current && e.detail) { e.preventDefault(); e.stopPropagation(); }
    },
  }};
}
