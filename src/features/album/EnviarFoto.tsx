import { useRef, useState, useEffect } from "react";
import { apiFotos, type VagaFoto } from "./fotos";

export function EnviarFoto({
  vaga,
  cor,
  voltar,
  concluir,
}: {
  vaga: VagaFoto;
  cor: string;
  voltar: () => void;
  concluir: () => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [local, setLocal] = useState("");
  const [legenda, setLegenda] = useState(vaga.legenda ?? ""),
    [erro, setErro] = useState(""),
    [busy, setBusy] = useState(false);
  const tentativa = useRef("");
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
    setErro("");
    try {
      const r = await apiFotos<{ preview: string }>(query("preparar"), file);
      setPreview(r.preview);
    } catch (e) {
      falhou(e);
    } finally {
      setBusy(false);
    }
  }
  function escolher(file?: File) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setArquivo(null);
      setPreview("");
      setErro("Selecione uma foto de até 15 MB.");
      return;
    }
    tentativa.current = crypto.randomUUID();
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
    try {
      await apiFotos(
        remover
          ? "?acao=remover&posicao=" + vaga.posicao + "&versao=" + vaga.versao
          : query("confirmar"),
        JSON.stringify({ legenda }),
      );
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
      {imagem && (
        <img
          src={imagem}
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
      <fieldset disabled={busy}>
        <legend>{vaga.foto ? "Escolher outra foto" : "Escolher foto"}</legend>
        <label>
          Tirar foto
          <input
            type="file"
            accept="image/*"
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
      <label>
        Legenda (opcional)
        <textarea
          maxLength={500}
          value={legenda}
          disabled={!arquivo || busy}
          onChange={(e) => setLegenda(e.target.value)}
        />
      </label>
      {busy && <p role="status">Processando foto…</p>}
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
      {vaga.foto && (
        <button disabled={busy} onClick={() => confirmar(true)}>
          Remover foto
        </button>
      )}
      <button disabled={busy} onClick={voltar}>
        Voltar à coleção
      </button>
    </section>
  );
}
