import { useEffect, useRef, useState } from "react";
import { db } from "./client";
import type { Wheel } from "../../vendor/spin-wheel/spin-wheel.js";
import "./roleta.css";

const cores = [
  ["Amarelo","#f4ca40"], ["Laranja","#f28844"], ["Vermelho","#d34a48"],
  ["Rosa","#e69cb1"], ["Roxo","#8454a0"], ["Azul-marinho","#193954"],
  ["Turquesa","#40b9af"], ["Verde","#528358"], ["Branco","#fff"],
  ["Dourado","#bf8b24"], ["Marrom","#855335"], ["Azul-celeste","#79bcec"], ["Cinza","#80868a"],
];

export function RoletaCor({ continuar }: { continuar:()=>void }) {
  const disco = useRef<HTMLDivElement>(null);
  const [resultado, setResultado] = useState("");
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    let roda: Wheel | undefined;
    function mostrar(nome: string) {
      if (!ativo) return;
      sessionStorage.removeItem("ohana-primeira-cor");
      setResultado(nome);
    }
    async function revelar() {
      const {data,error} = await db.rpc("missao_album");
      if (!ativo) return;
      const nome: string | undefined = data?.cor?.nome;
      if (error || !nome) { setErro(true); return; }
      const indice = cores.findIndex(([cor])=>cor === nome);
      if (indice < 0) { mostrar(nome); return; }
      try {
        const {Wheel} = await import("../../vendor/spin-wheel/spin-wheel.js");
        if (!ativo || !disco.current) return;
        roda = new Wheel(disco.current, {
          items:cores.map(([label,backgroundColor])=>({label,backgroundColor,
            labelColor:["Roxo","Azul-marinho","Marrom"].includes(label) ? "#fffaf0" : "#102934"})),
          isInteractive:false, radius:.96, borderColor:"#123e50", borderWidth:3,
          lineColor:"#fff5df", lineWidth:1, itemLabelFont:"Barlow, sans-serif",
          pixelRatio:Math.min(window.devicePixelRatio || 1,2),
          onRest:()=>mostrar(nome),
        });
        const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
        roda.spinToItem(indice, reduzir ? 0 : 2600, true, reduzir ? 0 : 3);
      } catch { mostrar(nome); }
    }
    void revelar().catch(()=>{ if (ativo) setErro(true); });
    return () => { ativo=false; roda?.remove(); };
  },[tentativa]);

  return <main className="sorteio-entrada">
    <h1>Sua cor da viagem</h1>
    <div className="sorteio-disco" aria-hidden="true">
      <div className="sorteio-canvas" ref={disco}/>
      <img className="sorteio-selo" src="/ohana-roleta.webp" width="240" height="240" alt=""/>
    </div>
    <p role="status">{erro ? "Não conseguimos carregar sua cor." : resultado || "Girando a roleta…"}</p>
    {erro && <button onClick={()=>{setErro(false); setTentativa(n=>n+1);}}>Tentar novamente</button>}
    {(resultado || erro) && <button onClick={continuar}>Continuar na viagem</button>}
  </main>;
}
