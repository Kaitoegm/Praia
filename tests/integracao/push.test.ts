import { expect, test, vi } from "vitest";
import { prepararJogos } from "../fixtures/jogos";
const { enviarPush } = vi.hoisted(() => ({ enviarPush: vi.fn() }));
vi.mock("web-push", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()), sendNotification: enviarPush,
}));
import { entregar } from "../../server/avisos.mjs";

test("fila mantém falhas temporárias, confirma entrega e remove aparelho expirado", async () => {
  const f = await prepararJogos();
  try {
    const endpoint = "https://fcm.googleapis.com/fcm/send/" + f.viagem;
    const assinatura = { endpoint, keys: { auth: "teste", p256dh: "teste" } };
    const cadastro = await f.admin.from("aparelhos_push").insert({
      endpoint, assinatura, usuario_id: f.familiar.session.user.id,
    });
    expect(cadastro.error).toBeNull();
    async function publicar(posicao: number) {
      const r = await f.admin.from("vagas_foto").update({ arquivo: crypto.randomUUID() })
        .match({ viagem_id: f.viagem, vaga: 1, posicao });
      expect(r.error).toBeNull();
    }
    const fila = () => f.admin.from("entregas_push").select("aviso").eq("endpoint", endpoint);
    await publicar(1);
    enviarPush.mockRejectedValueOnce(new Error("Indisponível"));
    await entregar(f.admin);
    expect((await fila()).data).toHaveLength(1);
    await entregar(f.admin);
    expect(enviarPush).toHaveBeenCalledTimes(1);
    await f.admin.from("entregas_push").update({ disponivel: new Date(0).toISOString() }).eq("endpoint", endpoint);
    enviarPush.mockResolvedValueOnce({});
    await entregar(f.admin);
    expect((await fila()).data).toHaveLength(0);
    await publicar(2);
    enviarPush.mockRejectedValueOnce(Object.assign(new Error(), { statusCode: 410 }));
    await entregar(f.admin);
    expect((await fila()).data).toHaveLength(0);
    expect((await f.admin.from("aparelhos_push").select("endpoint").eq("endpoint",endpoint)).data).toHaveLength(0);
  } finally {
    vi.clearAllMocks();
    await f.limpar();
  }
}, 90000);
