import artes from "./paginas.json";

export const cores = [
  ["Amarelo","#f4ca40"], ["Laranja","#f28844"], ["Vermelho","#d34a48"],
  ["Rosa","#e69cb1"], ["Roxo","#8454a0"], ["Azul-marinho","#193954"],
  ["Turquesa","#40b9af"], ["Verde","#528358"], ["Branco","#fff"],
  ["Dourado","#bf8b24"], ["Marrom","#855335"], ["Azul-celeste","#79bcec"], ["Cinza","#80868a"],
];

export function arteDaCor(cor: string) {
  return artes[cor as keyof typeof artes];
}
