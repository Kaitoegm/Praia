import molduras from "./molduras-marinho.json";
import { VisorMoldura } from "./VisorMoldura";
import { useCallback, useRef, useState, useEffect, type RefObject } from "react";
import { apiFotos, type VagaFoto } from "./fotos";

import { lerRascunho, salvarRascunho, type Rascunho } from "./rascunhos";

export function EnviarFoto({
  camera,
  chaveRascunho,
  vaga,
  cor,
  voltar,
  concluir,
}: {
  camera: RefObject<HTMLInputElement | null>;
  chaveRascunho: string;
  vaga: VagaFoto;
  cor: string;
  voltar: () => void;
  concluir: () => void;
}) {
  const m = cor === "Azul-marinho" ? molduras[vaga.posicao-1] : undefined;
  const [visor, setVisor] = useState(!vaga.foto);
  const fecharVisor = useCallback(() => setVisor(false), []);
  const [arquivo, setArquivo] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [local, setLocal] = useState("");
  const [legenda, setLegenda] = useState(vaga.legenda ?? ""),
    [erro, setErro] = useState(""),
    [busy, setBusy] = useState(false);
  const tentativa = useRef("");
  const rascunho = useRef<Rascunho | undefined>(undefined);
  const [lendo, setLendo] = useState(true);
  const [avisoLocal, setAvisoLocal] = useState("");
  const [fase, setFase] = useState("");
  function guardar(valor?: Rascunho, novaFoto = false) {
    rascunho.current = valor;
    return salvarRascunho(chaveRascunho, valor, novaFoto).catch(() => {
      setAvisoLocal("O navegador não conseguiu salvar o rascunho. Mantenha esta tela aberta.");
    });
  }
  useEffect(() => {
    let ativo = true;
    lerRascunho(chaveRascunho).then(async (salvo) => {
      if (!ativo || !salvo || rascunho.current) return;
      if (salvo.versao !== vaga.versao) {
        await salvarRascunho(chaveRascunho);
        return;
      }
      // Tentativas não confirmadas expiram no servidor depois de 24 horas.
      if (Date.now() - salvo.criado >= 86400000) {
        salvo.tentativa = crypto.randomUUID();
        salvo.criado = Date.now();
      }
      rascunho.current = salvo;
      tentativa.current = salvo.tentativa;
      setArquivo(salvo.arquivo);
      setLegenda(salvo.legenda);
      if (salvo.preview && salvo.preparadoEm && Date.now() - salvo.preparadoEm < 14 * 60 * 1000) {
        setPreview(salvo.preview);
      }
      setErro("Rascunho recuperado. Retome o envio quando tiver conexão.");
    }).catch(() => {
      if (ativo) setAvisoLocal("O rascunho só ficará disponível enquanto esta tela estiver aberta.");
    }).finally(() => { if (ativo) setLendo(false); });
    return () => { ativo = false; };
  }, [chaveRascunho, vaga.versao]);
  useEffect(() => {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    setLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);
  const query = (acao: string) =>
    "?" +
    new URLSearchParams({
      acao,
      posicao: String(vaga.posicao),
      versao: String(vaga.versao),
      tentativa: tentativa.current,
    });
  function falhou(e: unknown) {
    setErro(
      e instanceof TypeError
        ? "A conexão falhou. Sua seleção está aqui. Tente novamente."
        : e instanceof Error
          ? e.message
          : "Não foi possível concluir.",
    );
  }
  async function preparar(file: File) {
    setBusy(true);
    setFase("Enviando e preparando a foto…");
    setErro("");
    try {
      const r = await apiFotos<{ preview: string }>(query("preparar"), file);
      setPreview(r.preview);
      if (rascunho.current) await guardar({ ...rascunho.current, preview: r.preview, preparadoEm: Date.now() });
    } catch (e) {
      falhou(e);
    } finally {
      setBusy(false);
    }
  }
  function escolher(file?: File) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {

      setErro("Selecione uma foto de até 15 MB.");
      return;
    }
    setVisor(false);
    tentativa.current = crypto.randomUUID();
    void guardar({ arquivo: file, legenda, versao: vaga.versao, tentativa: tentativa.current, criado: Date.now() }, true);
    setArquivo(file);
    setPreview("");
    setLocal("");
    void preparar(file);
  }
  async function confirmar(remover: boolean) {
    if (
      remover &&
      !window.confirm("Remover a foto da posição " + vaga.posicao + "?")
    )
      return;
    setBusy(true);
    setErro("");
    setFase(remover ? "Removendo foto…" : "Confirmando publicação…");
    try {
      await apiFotos(
        remover
          ? "?acao=remover&posicao=" + vaga.posicao + "&versao=" + vaga.versao
          : query("confirmar"),
        JSON.stringify({ legenda }),
      );
      await guardar();
      await concluir();
    } catch (e) {
      falhou(e);
    } finally {
      setBusy(false);
    }
  }
  const imagem = arquivo ? preview || local : vaga.foto;
  return (
    <section className="envio">
      <h2>Foto {vaga.posicao} de 9</h2>
      <p>Minha cor · {cor}</p>
      {m && !lendo && !arquivo && (visor
        ? <VisorMoldura proporcao={m.w/m.h} escolher={escolher} fechar={fecharVisor}/>
        : <button onClick={() => setVisor(true)}>Abrir visor da moldura</button>)}
      {imagem && (
        <img
          src={imagem}
          style={m ? {width:"100%",height:"auto",maxHeight:"none",aspectRatio:m.w/m.h,objectFit:"cover"} : undefined}
          alt={
            arquivo
              ? "Prévia da foto selecionada"
              : vaga.legenda || "Foto da sua coleção"
          }
          onError={() => {
            if (!preview) setLocal("");
          }}
        />
      )}
      {arquivo && <label className="legenda-postal">
        Legenda (opcional)
        <textarea
          maxLength={500}
          value={legenda}
          disabled={!arquivo || (busy && !!preview)}
          onChange={(e) => {
            const texto = e.target.value;
            setLegenda(texto);
            if (rascunho.current) void guardar({ ...rascunho.current, legenda: texto });
          }}
        />
      </label>}
      <fieldset disabled={busy}>
        <legend>{vaga.foto ? "Escolher outra foto" : "Escolher foto"}</legend>
        <label>
          Tirar foto
          <input
            type="file"
            accept="image/*"
            ref={camera}
            capture="environment"
            onChange={(e) => {
              escolher(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label>
          Escolher da galeria
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            onChange={(e) => {
              escolher(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </fieldset>
      {busy && <p role="status">{fase}</p>}
      {avisoLocal && <p role="status">{avisoLocal}</p>}
      {erro && <p role="alert">{erro}</p>}
      {arquivo && !preview && erro && (
        <button disabled={busy} onClick={() => preparar(arquivo)}>
          Tentar novamente
        </button>
      )}
      {preview && (
        <button disabled={busy} onClick={() => confirmar(false)}>
          {erro ? "Tentar novamente" : "Enviar foto"}
        </button>
      )}
      {arquivo && (
        <button disabled={busy} onClick={async () => {
          if (!window.confirm("Descartar esta seleção e a legenda do rascunho?")) return;
          await guardar();
          setArquivo(null);
          setLocal("");
          setPreview("");
          setLegenda(vaga.legenda ?? "");
          setErro("");
        }}>Descartar rascunho</button>
      )}
      {vaga.foto && (
        <button disabled={busy} onClick={() => confirmar(true)}>
          Remover foto
        </button>
      )}
      <button disabled={busy || lendo} onClick={voltar}>
        Voltar à coleção
      </button>
    </section>
  );
}
