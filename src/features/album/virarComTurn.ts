import $ from "../../vendor/turn/turn.js";

export function virarComTurn(livro: HTMLDivElement, atual: HTMLDivElement, seguinte: HTMLDivElement,
  espelhar: boolean, concluir: () => void) {
  const palco = document.createElement("div");
  palco.className = "virada-turn";
  palco.setAttribute("aria-hidden", "true");
  palco.inert = true;
  if (espelhar) palco.dataset.espelhado = "true";
  for (const folha of [atual, seguinte]) {
    const pagina = document.createElement("div");
    const copia = folha.cloneNode(true) as HTMLDivElement;
    copia.removeAttribute("style");
    copia.removeAttribute("data-ativa");
    copia.removeAttribute("data-vizinha");
    copia.querySelector(".marinho-sombra")?.remove();
    pagina.append(copia);
    palco.append(pagina);
  }
  livro.append(palco);
  const turn = $(palco);
  let timer: number | undefined;
  function limpar() {
    window.clearTimeout(timer);
    turn.off("turned");
    try { turn.turn("stop"); } finally { turn.remove(); }
  }
  function terminar() {
    limpar();
    concluir();
  }
  try {
    turn.turn({display:"single", width:livro.clientWidth, height:livro.clientHeight,
      duration:1000, gradients:true, programmatic:true});
    turn.one("turned", terminar);
    timer = window.setTimeout(terminar, 1200);
    turn.turn("page", 2);
    return limpar;
  } catch {
    window.clearTimeout(timer);
    turn.remove();
    return undefined;
  }
}
