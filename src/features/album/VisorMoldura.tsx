import { useEffect, useRef, useState } from "react";

export function VisorMoldura({ proporcao, escolher, fechar }: {
  proporcao: number; escolher: (file: File) => void; fechar: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => {
    let ativo = true;
    let fluxo: MediaStream | undefined;
    async function abrir() {
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: {ideal:"environment"}, width:{ideal:1920}, height:{ideal:1080} }, audio:false });
        if (!ativo || !video.current) { fluxo.getTracks().forEach(t => t.stop()); return; }
        video.current.srcObject = fluxo;
        await video.current.play();
      } catch { if (ativo) setErro("Câmera indisponível. Use a câmera do celular ou escolha da galeria abaixo."); }
    }
    void abrir();
    const ocultar = () => { if (document.hidden) fechar(); };
    document.addEventListener("visibilitychange", ocultar);
    return () => { ativo=false; fluxo?.getTracks().forEach(t=>t.stop()); document.removeEventListener("visibilitychange", ocultar); };
  }, [fechar]);
  async function disparar() {
    const v = video.current;
    if (!v?.videoWidth || !v.videoHeight) return;
    setPronto(false);
    const largura = Math.min(v.videoWidth, v.videoHeight * proporcao);
    const altura = largura / proporcao;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(largura); canvas.height = Math.round(altura);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(v, (v.videoWidth-largura)/2, (v.videoHeight-altura)/2, largura, altura, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob|null>(ok=>canvas.toBlob(ok,"image/jpeg",0.92));
      if (blob) { escolher(new File([blob],"foto.jpg",{type:"image/jpeg"})); return; }
    }
    setErro("Use a câmera do celular ou escolha da galeria abaixo.");
  }
  return <div>{erro ? <p role="status">{erro}</p> : <>
    <video ref={video} autoPlay playsInline muted onLoadedData={()=>setPronto(true)}
      aria-label="Enquadramento da moldura" style={{width:"100%", maxHeight:"none",aspectRatio:proporcao,objectFit:"cover",display:"block",background:"#102736"}}/>
    <button type="button" disabled={!pronto} onClick={disparar}>Fotografar</button>
  </>}</div>;
}
