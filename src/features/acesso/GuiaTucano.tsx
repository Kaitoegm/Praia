import { useEffect, useRef } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./guia-tucano.css";

const etapas: DriveStep[] = [
  { popover: { title:"Bem-vindo ao OHANA!", description:"Sou o tucano da viagem. Vamos explorar o OHANA juntos?" } },
  { element:'nav a[href="/agenda"]', popover:{title:"Agenda",description:"Escolha um dia da viagem para conferir os horários e locais das atividades."} },
  { element:'nav a[href="/ranking"]', popover:{title:"Jogos",description:"Acompanhe os pontos e o ranking das rodadas da família."} },
  { element:'nav a[href="/album"]', disableActiveInteraction:false, advanceOn:{event:"click",strict:true},
    focus:"element", popover:{title:"Álbum",description:"Vamos abrir seu álbum de viagem.",instruction:"Toque na aba Álbum para avançar."} },
  { element:'[data-guia="minha-cor"]', popover:{title:"Minha cor",description:"Toque numa moldura da sua cor para tirar ou escolher uma foto. São nove espaços para preencher durante a viagem."} },
  { element:'[data-guia="da-familia"]', popover:{title:"Álbum da família",description:"Veja as fotos de todos. Deslize para a esquerda para avançar ou toque na cor para escolher outro capítulo."} },
  { element:'[data-guia="avisos"]', popover:{title:"Avisos de novas fotos",description:"Quando alguém publicar, toque no sino para abrir o aviso e ir até a foto."} },
  { popover:{title:"Boa viagem!",description:"A aventura começa aqui. Para rever as dicas, abra Ver guia do tucano no Perfil."} },
];

export function GuiaTucano({ fechar, abrirTela }: { fechar: () => void; abrirTela: (url: string) => void }) {
  const acoes = useRef({fechar, abrirTela});
  acoes.current = {fechar, abrirTela};

  useEffect(() => {
    const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let desmontando = false;

    function mover(indice: number) {
      if (indice >= etapas.length) { tour.destroy(); return; }
      if (indice === 4) acoes.current.abrirTela("/album");
      if (indice === 5) acoes.current.abrirTela("/album?familia=1");
      tour.moveTo(indice);
    }

    const tour = driver({
      steps: etapas, animate: !reduzir, duration:220, smoothScroll:!reduzir,
      overlayColor:"#112d40", overlayOpacity:.68, overlayClickBehavior:"none",
      stagePadding:5, stageRadius:11, popoverOffset:12, popoverClass:"tucano-tour",
      disableActiveInteraction:true, waitForElement:1500, skipMissingElement:true,
      showProgress:true, progressText:"Parada {{current}} de {{total}}",
      nextBtnText:"Próximo", prevBtnText:"Voltar", doneBtnText:"Concluir",
      closeBtnLabel:"Fechar guia",
      onNextClick:() => mover((tour.getActiveIndex() ?? 0) + 1),
      onPrevClick:() => mover(Math.max(0,(tour.getActiveIndex() ?? 0) - 1)),
      onPopoverRender:(popover,{state}) => {
        const indice = state.activeIndex ?? 0;
        popover.title.setAttribute("role", "heading");
        popover.title.setAttribute("aria-level", "2");
        popover.wrapper.style.setProperty("--guia-progresso", `${(indice + 1) / etapas.length * 100}%`);
        const mascote = document.createElement("img");
        mascote.src = etapas[indice]?.element ? "/tucano-aponta.webp" : "/tucano-conversa.webp";
        mascote.alt = "";
        mascote.className = "tucano-tour-mascote";
        popover.description.prepend(mascote);
        const pular = document.createElement("button");
        pular.type = "button";
        pular.className = "tucano-tour-pular";
        pular.textContent = "Pular guia";
        pular.onclick = () => tour.destroy();
        popover.wrapper.append(pular);
      },
      onDestroyed:() => {
        if (desmontando) return;
        acoes.current.fechar();
        if (focoAnterior?.isConnected) focoAnterior.focus({preventScroll:true});
        else document.querySelector<HTMLElement>("main")?.focus({preventScroll:true});
      },
    });
    tour.drive();
    return () => {
      desmontando = true;
      if (tour.isActive()) tour.destroy();
    };
  }, []);
  return null;
}
