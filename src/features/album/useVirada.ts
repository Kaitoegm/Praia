import { virarComTurn } from "./virarComTurn";
import { flushSync } from "react-dom";
import { useEffect, useRef, useState, type RefObject, type PointerEvent } from "react";

// O índice só muda quando a folha assenta. Durante o gesto, apenas a camada de papel se move.
export function useVirada(memoria: RefObject<number>, total: number, sentidoAvanco: 1 | -1) {
  const livro = useRef<HTMLDivElement>(null);
  const [pagina, setPagina] = useState(memoria.current);
  const progresso = useRef(0);
  const folha = useRef<HTMLDivElement>(null);
  const sombra = useRef<HTMLSpanElement>(null);
  const quadro = useRef(0);
  const pendente = useRef(0);
  const limparTurn = useRef<(() => void) | undefined>(undefined);
  const destino = useRef(false);
  const animacoes = useRef<Animation[]>([]);
  const movimentoReduzido = useRef(false);
  const bloquearClique = useRef(false);
  const gesto = useRef<{
    id: number; x: number; y: number; largura: number; inicio: number;
    retomado: boolean; arrastando: boolean; ultimoX: number; instante: number; velocidade: number;
  } | null>(null);
  const papelMovel = useRef<HTMLDivElement | null>(null);
  function limparPapel() {
    papelMovel.current?.style.removeProperty("transform");
    papelMovel.current?.querySelector<HTMLElement>(".marinho-sombra")?.style.removeProperty("opacity");
    papelMovel.current?.removeAttribute("data-folheando");
    papelMovel.current = null;
  }
  const direcaoFisica = useRef<number>(sentidoAvanco);
  function prepararDirecao(sentido: number) {
    if (pagina + sentido < 1 || pagina + sentido > total) return false;
    direcaoFisica.current = sentido * sentidoAvanco;
    if (livro.current) livro.current.dataset.sentido = String(direcaoFisica.current);
    papelMovel.current = direcaoFisica.current < 0 ? folha.current
      : livro.current?.querySelector<HTMLDivElement>('[data-vizinha="1"]') ?? null;
    return true;
  }
  function irPara(n: number) {
    cancelAnimationFrame(quadro.current);
    quadro.current = 0;
    gesto.current = null;
    pararAnimacoes();
    progresso.current = 0;
    limparPapel();
    memoria.current = n;
    setPagina(n);
  }

  function rotacao(p: number) {
    // A largura projetada é largura * cos(ângulo). Sua borda percorre p * largura.
    return `rotateY(${-Math.acos(direcaoFisica.current < 0 ? 1-p : p)}rad)`;
  }
  const intensidade = (p: number) => (direcaoFisica.current < 0 ? p : 1-p) * .42;
  function desenhar(valor: number) {
    const p = Math.max(0, Math.min(1, valor));
    progresso.current = p;
    if (!movimentoReduzido.current && papelMovel.current) {
      papelMovel.current.dataset.folheando = "true";
      papelMovel.current.style.transform = rotacao(p);
      const luz = papelMovel.current.querySelector<HTMLElement>(".marinho-sombra");
      if (luz) luz.style.opacity = String(intensidade(p));
    }
  }
  function pararAnimacoes() {
    limparTurn.current?.();
    limparTurn.current = undefined;
    for (const a of animacoes.current) a.cancel();
    animacoes.current = [];
  }
  function assentar(avancar: boolean) {
    cancelAnimationFrame(quadro.current);
    quadro.current = 0;
    pararAnimacoes();
    const papel = papelMovel.current;
    const tinta = papel?.querySelector<HTMLElement>(".marinho-sombra");
    const de = progresso.current;
    const para = avancar ? 1 : 0;
    if (!papel || !tinta) return;
    destino.current = avancar;
    function terminar() {
      if (avancar) {
        memoria.current = pagina + direcaoFisica.current * sentidoAvanco;
        flushSync(() => setPagina(memoria.current));
      }
      pararAnimacoes();
      limparPapel();
      progresso.current = 0;
    }
    if (movimentoReduzido.current || de === para) { terminar(); return; }
    if (avancar && de === 0 && direcaoFisica.current < 0 && livro.current) {
      const vizinha = livro.current.querySelector<HTMLDivElement>(
        `[data-vizinha="${direcaoFisica.current}"]`,
      );
      if (vizinha) {
        limparTurn.current = virarComTurn(livro.current, papel, vizinha, false, () => {
          limparTurn.current = undefined;
          terminar();
        });
        if (limparTurn.current) return;
      }
    }
    papel.dataset.folheando = "true";
    const opcoes = {duration: Math.max(90, 240 * Math.abs(para - de)), easing:"cubic-bezier(.2,.65,.3,1)", fill:"forwards" as const};
    const giro = papel.animate([{transform:rotacao(de)}, {transform:rotacao(para)}], opcoes);
    const luz = tinta.animate([{opacity:intensidade(de)}, {opacity:intensidade(para)}], opcoes);
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
      limparPapel();
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
    if (limparTurn.current) { bloquearClique.current = true; return; }
    if (!e.isPrimary || e.button !== 0) return;
    cancelAnimationFrame(quadro.current);
    quadro.current = 0;
    atualizarPreferencia();
    const retomando = animacoes.current.length > 0 && papelMovel.current;
    if (retomando && papelMovel.current) {
      const transform = getComputedStyle(papelMovel.current).transform;
      const largura = transform === "none" ? 1 : new DOMMatrixReadOnly(transform).m11;
      const p = direcaoFisica.current < 0 ? 1-largura : largura;
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
      if (!g.retomado && !prepararDirecao(Math.sign(dx) * sentidoAvanco)) {
        bloquearClique.current = true;
        gesto.current = null;
        return;
      }
      g.arrastando = true;
      bloquearClique.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    g.velocidade = direcaoFisica.current * (e.clientX-g.ultimoX)/Math.max(1,e.timeStamp-g.instante);
    g.ultimoX = e.clientX;
    g.instante = e.timeStamp;
    pendente.current = g.inicio + direcaoFisica.current*dx/g.largura;
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
    desenhar(g.inicio + direcaoFisica.current*(e.clientX-g.x)/g.largura);
    const p = progresso.current;
    const rapido = e.timeStamp-g.instante < 80 && g.velocidade > .55;
    assentar(p >= .35 || (p >= .12 && rapido));
  }
  return { livro, folha, sombra, pagina, irPara, virar: (sentido: number) => { atualizarPreferencia(); if (!limparTurn.current && !gesto.current && !animacoes.current.length && prepararDirecao(sentido)) assentar(true); }, eventos: {
    onPointerDown: iniciar, onPointerMove: mover, onPointerUp: soltar,
    onPointerCancel: cancelar, onLostPointerCapture: (e: PointerEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && gesto.current?.arrastando) cancelar();
    },
    onClickCapture: (e: { detail:number; preventDefault():void; stopPropagation():void }) => {
      if (bloquearClique.current && e.detail) { e.preventDefault(); e.stopPropagation(); }
    },
  }};
}
