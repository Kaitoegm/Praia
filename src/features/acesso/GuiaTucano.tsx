import { useEffect, useRef } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./guia-tucano.css";

function parada(element: string, title: string, description: string, instruction: string): DriveStep {
  return {
    element, disableActiveInteraction:false, advanceOn:{event:"click", strict:true},
    focus:"element",
    popover:{title, description, instruction, showButtons:["previous","close"]},
  };
}

const etapas: DriveStep[] = [
  { popover:{title:"Bem-vindo ao OHANA!",description:"Sou o tucano da viagem. Bora fazer um passeio pelo OHANA?",nextBtnText:"Começar passeio"} },
  parada('nav a[href="/agenda"]', "Agenda", "Aqui ficam os horários e locais da viagem.", "Abra a Agenda."),
  parada('nav a[href="/ranking"]', "Jogos", "Aqui você acompanha os pontos de cada rodada.", "Toque em Jogos."),
  parada('nav a[href="/album"]', "Seu álbum", "Em Minha cor, você tem nove molduras para tirar ou escolher fotos.", "Abra o Álbum."),
  parada('[data-guia="da-familia"]', "Álbum da família", "Deslize para a esquerda para folhear. Toque na cor para escolher outro capítulo.", "Toque em Da família."),
  parada('[data-guia="avisos"]', "Avisos de novas fotos", "Quando alguém publicar, as novidades aparecem aqui.", "Toque no sino."),
  { popover:{title:"Boa viagem!",description:"Você já sabe onde encontrar tudo. Para repetir o passeio, abra Ver guia do tucano no Perfil."} },
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
