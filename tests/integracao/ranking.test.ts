import { test, expect } from "vitest";
import { prepararJogos } from "../fixtures/jogos";
import { classificar } from "../../src/features/jogos/Ranking";

test("rodada atômica, classificação compartilhada e correção auditada", async () => {
  const { org, familiar, pessoas, limpar } = await prepararJogos();
  try {
    const dados = {
      jogo: "Vôlei",
      titulo: "Primeira",
      pontuacoes: { 1: 12, 2: 12, 3: 8 },
      chave_operacao: crypto.randomUUID(),
    };
    const salvar = () => org.client.rpc("salvar_rodada", dados);
    for (const r of await Promise.all([salvar(), salvar()]))
      expect(r.error).toBeNull();
    const ler = async () => {
      const r = await familiar.client.rpc("historico_jogos");
      expect(r.error).toBeNull();
      return r.data;
    };
    let rows = await ler();
    expect(rows).toHaveLength(1);
    const pos = classificar(pessoas, rows);
    expect(pos.slice(0, 3).map((p) => [p.nome, p.posicao])).toEqual([
      ["Ana", 1],
      ["Bia", 1],
      ["Caio", 3],
    ]);
    expect(pos.filter((p) => p.total === 0)).toHaveLength(6);
    const correcao = {
      rodada: dados.chave_operacao,
      jogador: 3,
      esperado: 8,
      novo_valor: 13,
    };
    expect(
      (await familiar.client.rpc("corrigir_pontos", correcao)).error,
    ).toBeTruthy();
    expect(
      (
        await familiar.client.rpc("salvar_rodada", {
          ...dados,
          chave_operacao: crypto.randomUUID(),
        })
      ).error,
    ).toBeTruthy();
    expect(
      (await org.client.rpc("corrigir_pontos", correcao)).error,
    ).toBeNull();
    expect((await salvar()).error).toBeNull();
    expect(
      (
        await org.client.rpc("salvar_rodada", {
          ...dados,
          pontuacoes: { 1: 12, 2: -1 },
          chave_operacao: crypto.randomUUID(),
        })
      ).error,
    ).toBeTruthy();
    rows = await ler();
    expect(rows).toHaveLength(1);
    expect(rows[0].correcoes).toHaveLength(1);
    expect(rows[0].correcoes[0]).toMatchObject({
      anterior: 8,
      novo: 13,
      autor: org.session.user.id,
    });
    expect(classificar(pessoas, rows)[0]).toMatchObject({
      nome: "Caio",
      total: 13,
      posicao: 1,
    });
  } finally {
    await limpar();
  }
}, 90000);
