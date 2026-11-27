import { expect, test } from "@playwright/test";
import { prepararJogos } from "../fixtures/jogos";

test("texto ampliado e controles de toque nas telas da viagem", async ({ browser }) => {
  test.setTimeout(90000);
  const f = await prepararJogos();
  const ctx = await browser.newContext({ isMobile: true, hasTouch: true });
  try {
    await ctx.addInitScript(({key, session}) => localStorage.setItem(key, JSON.stringify(session)),
      {key: f.storageKey, session: f.familiar.session});
    const page = await ctx.newPage();
    await page.route("**/api/fotos?colecao=familia", route => route.fulfill({ json: [
      { cor:"Amarelo", vaga: 1, posicao: 1, versao: 1, foto: "http://127.0.0.1:4174/praia.jpg", mini: "http://127.0.0.1:4174/praia.jpg", legenda: "Fim de tarde na praia" },
      { cor:"Laranja", vaga: 2, posicao: 2, versao: 1, foto: "http://127.0.0.1:4174/praia.jpg", mini: "http://127.0.0.1:4174/praia.jpg", legenda: "Maré baixa" },
    ] }));
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({width, height: width === 320 ? 568 : 800});
      for (const [rota, titulo] of [["agenda","Agenda da viagem"],["ranking","Ranking dos jogos"],["perfil","Bia"],["album","Minha coleção"]]) {
        await page.goto("http://127.0.0.1:4174/" + rota);
        await expect(page.getByRole("heading", {name: titulo, exact:true})).toBeVisible({timeout:15000});
        async function conferirEncaixe() {
          const overflow = await page.locator("main").evaluate(el => ({
            horizontal: el.scrollWidth - el.clientWidth,
            vertical: el.scrollHeight - el.clientHeight,
          }));
          expect(overflow, rota + " em " + width).toEqual({ horizontal: 0, vertical: 0 });
        }
        await conferirEncaixe();
        if (rota === "album") {
          await page.getByRole("button",{name:"Da família"}).tap();
          await page.getByLabel("Capítulo").waitFor();
          await conferirEncaixe();
          await page.getByRole("button",{name:"Minha cor"}).tap();
        }
        await page.addStyleTag({content:"html { font-size: 200% !important; }"});
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      }
      await page.getByRole("button",{name:"Próxima página"}).tap();
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      const ultima = await page.getByRole("button",{name:"Abrir foto 9 de 9"}).boundingBox();
      const barra = await page.getByRole("navigation").boundingBox();
      expect(ultima!.y + ultima!.height).toBeLessThanOrEqual(barra!.y);
      await page.getByRole("button",{name:"Da família"}).tap();
      await page.getByRole("button", {name:"Fim de tarde na praia"}).tap();
      const modal = page.getByRole("dialog");
      await modal.getByRole("button",{name:"Próxima"}).tap();
      await expect(modal.getByRole("heading",{name:"Maré baixa"})).toBeVisible();
      expect(await modal.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await modal.getByRole("button",{name:"Fechar foto"}).tap();
      await expect(modal).toHaveCount(0);
    }
  } finally {
    await ctx.close();
    await f.limpar();
  }
});
