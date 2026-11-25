import { expect, test } from "vitest";
import { prepararJogos } from "../fixtures/jogos";

test("sorteio único com nove acessos completos e nove vagas de foto por pessoa", async () => {
  const { viagem, admin, org, familiar, completarPerfil, limpar } =
    await prepararJogos();
  try {
    for (let i = 3; i <= 8; i++) await completarPerfil(i);
    const sortear = () => org.client.rpc("sortear_cores", { viagem });
    expect((await sortear()).error?.message).toContain("nove cadastros");
    expect((await familiar.client.rpc("missao_album")).data).toMatchObject({
      cadastros: 8,
      sorteada: false,
      cor: null,
      vagas: [],
    });
    await completarPerfil(9);
    expect(
      (await familiar.client.rpc("sortear_cores", { viagem })).error,
    ).toBeTruthy();
    const [a, b] = await Promise.all([sortear(), sortear()]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    expect(new Set(a.data).size).toBe(9);
    expect(b.data).toEqual(a.data);
    const vagas = await admin
      .from("vagas_foto")
      .select("vaga,posicao,versao,arquivo")
      .eq("viagem_id", viagem)
      .order("posicao");
    expect(vagas.data).toHaveLength(81);
    for (let i = 1; i <= 9; i++)
      expect(
        vagas
          .data!.filter(
            (v) => v.vaga === i && v.arquivo === null && v.versao === 0,
          )
          .map((v) => v.posicao),
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect((await familiar.client.rpc("missao_album")).data.cor).toBeNull();
    expect((await familiar.client.rpc("revelar_minha_cor")).error).toBeNull();
    const missao = (await familiar.client.rpc("missao_album")).data;
    expect(missao.cor.id).toBe(a.data[1]);
    expect(missao.colecoes).toHaveLength(9);
    expect((await org.client.rpc("missao_album")).data.cor).toBeNull();
    expect((await sortear()).data).toEqual(a.data);
  } finally {
    await limpar();
  }
}, 120000);
