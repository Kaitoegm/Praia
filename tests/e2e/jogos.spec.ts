import { expect, test } from "@playwright/test";
import { prepararJogos } from "../fixtures/jogos";

test("organizador joga, revisa e corrige uma rodada no celular", async ({
  page,
}) => {
  test.setTimeout(100000);
  const { org, storageKey, limpar } = await prepararJogos();
  try {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.addInitScript(
      ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
      { key: storageKey, session: org.session },
    );
    await page.goto("http://127.0.0.1:4174/jogos");
    await expect(
      page.getByText("O primeiro jogo ainda vai começar."),
    ).toBeVisible();
    const lista = page.getByRole("list", { name: "Classificação" });
    await expect(lista.getByRole("listitem")).toHaveCount(2);
    await expect(lista.getByRole("img", { name: "Foto de Bia" })).toBeVisible();
    await expect(lista.getByText("Caio")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Lançar rodada" })).toHaveCount(0);
    await page.getByRole("link", {name: "Configurar viagem"}).click();
    await page.getByRole("link", {name: "Registrar pontos de um jogo"}).click();
    await page.getByLabel("Jogo", { exact: true }).fill("Frescobol");
    await page.getByLabel("Nome da rodada").fill("Final");
    for (const [nome, pontos] of [
      ["Ana", "0"],
      ["Bia", "8"],
    ]) {
      await page.getByRole("checkbox", { name: nome, exact: true }).check();
      await page.getByLabel("Pontos de " + nome, { exact: true }).fill(pontos);
    }
    await page.getByRole("button", { name: "Revisar resultado" }).click();
    await expect(page.getByText("Total da rodada: 8 pontos")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar resultado" }).click();
    await expect(page.getByRole("status")).toHaveText("Rodada registrada.");
    await page.locator("summary").filter({hasText:"Frescobol · Final"}).click();
    await page.getByRole("button", { name: "Corrigir pontos de Ana" }).click();
    await page.getByLabel("Novo valor para Ana").fill("9");
    await page.getByRole("button", { name: "Salvar correção" }).click();
    await expect(
      page
        .getByRole("list", { name: "Classificação" })
        .getByRole("listitem")
        .first(),
    ).toContainText("Ana · Você9 pts");
    await expect(page.getByText("Ana · 0 → 9 pts")).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    // Confira também a composição do placar cheio em telas estreitas.
    await page.route("**/rest/v1/participantes?*", async (route) => {
      const jogadores = Array.from({ length: 13 }, (_, i) => ({
        vaga: i + 1, nome: i === 12 ? "Nome de participante mais comprido" : "Viajante " + (i + 1),
        avatar: "/ohana-192.png", usuario_id: i === 0 ? org.session.user.id : crypto.randomUUID(),
      }));
      await route.fulfill({ json: jogadores });
    });
    await page.reload();
    await expect(lista.getByRole("listitem")).toHaveCount(13);
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
    await page.setViewportSize({ width: 390, height: 800 });
    await page.screenshot({ path: test.info().outputPath("ranking.png") });
  } finally {
    await limpar();
  }
});
