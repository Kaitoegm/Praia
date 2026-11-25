import { expect, test } from "vitest";
import { prepararJogos } from "../fixtures/jogos";

test("cadastros simultâneos recebem cores únicas e a troca de retrato preserva a missão", async () => {
  const f = await prepararJogos();
  try {
    const primeira = await f.org.client.rpc("missao_album");
    expect(primeira.data.cor.id).toBeTruthy();
    expect(primeira.data.vagas).toHaveLength(9);
    expect(primeira.data.cadastros).toBe(2);
    await Promise.all([f.completarPerfil(3), f.completarPerfil(4)]);
    const cores = await f.admin.from("atribuicoes_cor").select("cor_id").eq("viagem_id", f.viagem);
    expect(new Set(cores.data?.map(c => c.cor_id)).size).toBe(4);
    const troca = await f.admin.from("participantes").update({avatar: "/ohana-512.png"}).match({viagem_id:f.viagem,vaga:1});
    expect(troca.error).toBeNull();
    const depois = await f.org.client.rpc("missao_album");
    expect(depois.data.cor.id).toBe(primeira.data.cor.id);
    expect(depois.data.vagas).toEqual(primeira.data.vagas);
  } finally {
    await f.limpar();
  }
}, 90000);
