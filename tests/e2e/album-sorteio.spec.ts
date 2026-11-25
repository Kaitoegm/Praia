import { test, expect } from "@playwright/test";
import { prepararJogos } from "../fixtures/jogos";

test("familiar recebe sua cor no cadastro e reencontra sua missão em outro navegador", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const f = await prepararJogos();
  async function abrir(perfil: typeof f.org) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 800 },
    });
    await page.addInitScript(
      ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
      { key: f.storageKey, session: perfil.session },
    );
    await page.goto("http://127.0.0.1:4174/album");
    return page;
  }
  try {
    const familiar = await abrir(f.familiar);
    await expect(familiar.getByText("0 de 9 fotos enviadas")).toBeVisible();
    const cor = await familiar.locator(".postal-cor h1").innerText();
    await familiar.screenshot({
      path: test.info().outputPath("missao.png"),
      fullPage: true,
    });
    const outro = await abrir(f.familiar);
    await expect(outro.locator(".postal-cor h1")).toHaveText(cor, { useInnerText: true });
    await expect(outro.locator(".grid li")).toHaveCount(9);
    await expect(outro.getByText("Foto 9 de 9")).toBeVisible();
  } finally {
    await f.limpar();
  }
});
