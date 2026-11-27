import { test, expect } from "@playwright/test";
import { prepararJogos } from "../fixtures/jogos";

test.use({hasTouch:true, isMobile:true});

test("as nove molduras do marinho conservam a página e o formato", async ({ page, browserName }) => {
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
    // A borda livre deve seguir o dedo mesmo no primeiro quinto da virada.
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.move(x + caixa.width * .2,y,{steps:8});
    const folha = livro.locator('[data-ativa="true"]');
    await expect.poll(async () => (await folha.boundingBox())!.x - caixa.x)
      .toBeCloseTo(caixa.width * .2, -1);
    await page.mouse.move(x,y,{steps:5});
    await page.mouse.up();
    await arrastar(.08);
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    await arrastar(.50);
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
    if (browserName === "chromium") {
      const cdp = await page.context().newCDPSession(page);
      const tocar = (type: "touchStart" | "touchMove" | "touchEnd", pos?: number) =>
        cdp.send("Input.dispatchTouchEvent", {type,touchPoints:pos === undefined ? [] : [{x:caixa.x+caixa.width*pos,y}]});
      await tocar("touchStart", .74);
      await tocar("touchMove", .60);
      await tocar("touchMove", .22);
      await tocar("touchEnd");
      await expect(page.getByText("Página 1 de 2")).toBeVisible();
      await tocar("touchStart", .28);
      await tocar("touchMove", .45);
      await tocar("touchMove", .78);
      await tocar("touchEnd");
      await expect(page.getByText("Página 2 de 2")).toBeVisible();
      await cdp.detach();
    }
    await page.emulateMedia({reducedMotion:"reduce"});
    await page.getByRole("button",{name:"Página anterior"}).click();
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    await page.getByRole("button",{name:"Próxima página"}).click();
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
    await page.getByRole("button",{name:"Abrir foto 9 de 9"}).click();
    await expect(page.getByRole("heading",{name:"Foto 9 de 9"})).toBeVisible();
    await page.getByRole("button",{name:"Voltar à coleção"}).click();
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
    await page.getByRole("button",{name:"Da família"}).click();
    const indice = page.getByLabel("Capítulo");
    await expect(indice.locator("option")).toHaveCount(13);
    await livro.scrollIntoViewIfNeeded();
    const area = (await livro.boundingBox())!;
    async function folhearFamilia(de: number, para: number) {
      const altura = area.y + area.height * .5;
      await page.mouse.move(area.x + area.width * de, altura);
      await page.mouse.down();
      await page.mouse.move(area.x + area.width * para, altura, { steps: 8 });
      await page.mouse.up();
    }
    await folhearFamilia(.75, .25);
    await expect(page.getByText("Página 2 de 26")).toBeVisible();
    await folhearFamilia(.25, .75);
    await expect(page.getByText("Página 1 de 26")).toBeVisible();
    await indice.selectOption("5");
    await expect(page.getByText("Página 11 de 26")).toBeVisible();
    await page.getByRole("button",{name:"Próxima página"}).click();
    await page.getByText("Página 12 de 26").waitFor();
    await page.getByRole("button",{name:"Próxima página"}).click();
    await expect(indice).toHaveValue("6");
    await page.getByRole("button",{name:"Página anterior"}).click();
    await expect(page.getByText("Página 12 de 26")).toBeVisible();
    await indice.selectOption("12");
    await page.getByRole("button",{name:"Próxima página"}).click();
    await expect(page.getByText("Página 26 de 26")).toBeVisible();
    await expect(page.getByRole("button",{name:"Próxima página"})).toBeDisabled();
    for (let capitulo = 0; capitulo < 13; capitulo++) {
      await indice.selectOption(String(capitulo));
      for (const lado of [1, 2]) {
        if (lado === 2) await page.getByRole("button",{name:"Próxima página"}).click();
        await expect(page.getByText(`Página ${capitulo*2+lado} de 26`)).toBeVisible();
        const medida = (await livro.boundingBox())!;
        expect(medida.width).toBeCloseTo(area.width, 0);
        expect(medida.height).toBeCloseTo(area.height, 0);
        const arte = (await livro.locator('[data-ativa="true"] .arte-pagina').boundingBox())!;
        expect(arte.width).toBeCloseTo(medida.width, 0);
        expect(arte.height).toBeCloseTo(medida.height, 0);
      }
    }
  } finally {await f.limpar();}
});
