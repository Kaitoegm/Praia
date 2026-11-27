type LivroTurn = {
  turn(opcoes: {display: "single"; width: number; height: number; duration: number; gradients: boolean; programmatic: boolean}): LivroTurn;
  turn(acao: "page", pagina: number): LivroTurn;
  turn(acao: "stop"): LivroTurn;
  one(evento: "turned", concluir: () => void): LivroTurn;
  off(evento: "turned"): LivroTurn;
  remove(): void;
};
declare const jqueryTurn: (elemento: HTMLElement) => LivroTurn;
export default jqueryTurn;
