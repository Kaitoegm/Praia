import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const falas = [
  { titulo: "Bem-vindo ao OHANA!", texto: "Eu sou o tucano da viagem. Vou te mostrar onde encontrar tudo.", aponta: false },
  { titulo: "Agenda", texto: "Toque em Agenda na barra inferior. Escolha um dia para ver as atividades e os horários.", aponta: true },
  { titulo: "Jogos", texto: "Em Jogos você acompanha a classificação e os pontos de cada rodada.", aponta: true },
  { titulo: "Álbum", texto: "Abra Minha cor e toque numa moldura para tirar ou escolher uma foto. Você tem nove espaços para preencher durante a viagem.", aponta: true },
  { titulo: "Álbum da família", texto: "Toque em Da família para ver as fotos de todos. Deslize para a esquerda para avançar e abra o sino para ver as novidades.", aponta: true },
  { titulo: "Boa viagem!", texto: "Se quiser rever estas dicas, o guia fica no seu Perfil. Até a próxima!", aponta: false },
];

export function GuiaTucano({ fechar }: { fechar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [passo, setPasso] = useState(0);
  const fala = falas[passo];

  useEffect(() => {
    const modal = dialogo.current;
    if (!modal) return;
    modal.showModal();
    return () => modal.close();
  }, []);

  return (
    <dialog ref={dialogo} className="guia-tucano" aria-labelledby="guia-titulo"
      onCancel={event => { event.preventDefault(); fechar(); }}>
      <button type="button" className="guia-fechar" aria-label="Fechar guia" onClick={fechar}><X size={19} aria-hidden="true"/></button>
      <div className="guia-cena" key={passo}>
        <img src={fala.aponta ? "/tucano-aponta.webp" : "/tucano-conversa.webp"} alt="" />
        <div className="guia-balao" aria-live="polite">
          <h2 id="guia-titulo">{fala.titulo}</h2>
          <p>{fala.texto}</p>
        </div>
      </div>
      <div className="guia-acoes">
        <button className="botao-ohana botao-ohana--secundario"
          onClick={() => passo > 0 ? setPasso(passo - 1) : fechar()}>
          {passo > 0 ? "Voltar" : "Pular guia"}
        </button>
        <span aria-label={`Dica ${passo + 1} de ${falas.length}`}>{passo + 1}/{falas.length}</span>
        <button className="botao-ohana" autoFocus
          onClick={() => passo === falas.length - 1 ? fechar() : setPasso(passo + 1)}>
          {passo === falas.length - 1 ? "Concluir" : "Próximo"}
        </button>
      </div>
    </dialog>
  );
}
