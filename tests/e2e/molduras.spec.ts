import { test, expect } from "@playwright/test";
import { prepararJogos } from "../fixtures/jogos";

test("as nove molduras do marinho conservam a página e o formato", async ({ page }) => {
  const f = await prepararJogos();
  try {
    await page.setViewportSize({width:390,height:844});
    await page.addInitScript(({key, session})=>localStorage.setItem(key, JSON.stringify(session)),{key:f.storageKey,session:f.org.session});
    await page.route("**/rpc/missao_album", r=>r.fulfill({json:{cor:{nome:"Azul-marinho",amostra:"#193954"}}}));
    await page.route("**/api/fotos", r=>r.fulfill({json:Array.from({length:9},(_,i)=>({vaga:1,posicao:i+1,versao:0,mini:null,foto:null}))}));
    await page.goto("http://127.0.0.1:4174/album");
    await expect(page.locator(".marinho-folha").first().getByRole("button")).toHaveCount(4);
    await expect(page.locator(".marinho-folha").last().locator("button")).toHaveCount(5);
    const livro = page.locator(".marinho-livro");
    await livro.scrollIntoViewIfNeeded();
    const caixa = (await livro.boundingBox())!;
    const x = caixa.x + caixa.width * .28, y = caixa.y + caixa.height * .20;
    async function arrastar(distancia: number) {
      await page.mouse.move(x,y);
      await page.mouse.down();
      await page.mouse.move(x + caixa.width * distancia,y,{steps:8});
      await page.mouse.up();
    }
    await arrastar(.08);
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    await arrastar(.50);
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
    await page.emulateMedia({reducedMotion:"reduce"});
    await page.getByRole("button",{name:"Página anterior"}).click();
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    await page.getByRole("button",{name:"Próxima página"}).click();
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
    await page.getByRole("button",{name:"Abrir foto 9 de 9"}).click();
    await expect(page.getByRole("heading",{name:"Foto 9 de 9"})).toBeVisible();
    await page.getByRole("button",{name:"Voltar à coleção"}).click();
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
  } finally {await f.limpar();}
});
