import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { prepararJogos } from "../fixtures/jogos";

test("nona foto, confirmação perdida, privacidade e troca interrompida", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(150000);
  const f = await prepararJogos(),
    base = "http://127.0.0.1:4174/api/fotos";
  const headers = {
    Authorization: "Bearer " + f.familiar.session.access_token,
  };
  const adminHeaders = {
    Authorization: "Bearer " + f.org.session.access_token,
  };
  const bytes = await readFile("public/praia.jpg");
  try {
    expect((await request.get(base)).status()).toBe(401);
    const observer = await browser.newPage({
      viewport: { width: 390, height: 800 },
    });
    await observer.addInitScript(
      ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
      { key: f.storageKey, session: f.org.session },
    );
    await observer.goto("http://127.0.0.1:4174/album?familia=1");
    await expect(
      observer.getByText("A primeira foto da família vai aparecer aqui."),
    ).toBeVisible();
    for (let pos = 1; pos <= 8; pos++) {
      const qs =
        "&versao=0&posicao=" + pos + "&tentativa=" + crypto.randomUUID();
      const stage = await request.post(base + "?acao=preparar" + qs, {
        headers,
        data: bytes,
      });
      expect(stage.status(), await stage.text()).toBe(200);
      if (pos === 1) {
        expect(
          (
            await request.post(base + "?acao=confirmar" + qs, {
              headers: adminHeaders,
              data: { legenda: "" },
            })
          ).status(),
        ).toBe(409);
        expect(
          (
            await request.post(
              base +
                "?acao=preparar&versao=0&posicao=10&tentativa=" +
                crypto.randomUUID(),
              { headers, data: bytes },
            )
          ).status(),
        ).toBe(400);
        expect(
          (
            await request.post(base + "?acao=preparar" + qs, {
              headers,
              data: Buffer.alloc(15 * 1024 * 1024 + 1),
            })
          ).status(),
        ).toBe(413);
      }
      expect(
        (
          await request.post(base + "?acao=confirmar" + qs, {
            headers,
            data: { legenda: "Praia" },
          })
        ).status(),
      ).toBe(200);
    }
    const outras = await (
      await request.get(base, { headers: adminHeaders })
    ).json();
    const capitulo = observer.getByLabel("Capítulo");
    const participante = capitulo.locator("option").filter({hasText:" · Bia"});
    await capitulo.selectOption(await participante.getAttribute("value") as string);
    await expect(observer.getByRole("button", {name:"Praia"}).first()).toBeVisible({timeout:12000});
    await observer
      .getByRole("button", { name: "Notificações", exact: true })
      .click();
    await expect(observer.locator(".caixa-avisos>a")).toHaveCount(8);
    await observer.getByRole("button", { name: "Fechar notificações" }).click();
    await observer.getByRole("button", {name:"Praia"}).first().click();
    await expect(observer.getByRole("dialog")).toBeVisible();
    await observer.getByRole("button", { name: "Fechar foto" }).click();
    expect(
      outras.every((v: { foto: unknown }) => v.foto === null),
    ).toBeTruthy();
    const chaves = await f.admin
      .from("vagas_foto")
      .select("arquivo")
      .eq("viagem_id", f.viagem)
      .eq("vaga", 2)
      .eq("posicao", 1)
      .single();
    expect(
      (
        await f.org.client.storage
          .from("album-privado")
          .download(chaves.data!.arquivo + "/foto.jpg")
      ).error,
    ).toBeTruthy();
    await page.setViewportSize({ width: 390, height: 800 });
    await page.addInitScript(
      ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
      { key: f.storageKey, session: f.familiar.session },
    );
    await page.goto("http://127.0.0.1:4174/album");
    await page.getByRole("button",{name:"Próxima página"}).click();
    await page.getByRole("button", { name: "Abrir foto 9 de 9" }).click();
    await expect(page.getByLabel("Legenda (opcional)")).toHaveCount(0);
    await page.route("**/api/fotos?acao=preparar*", (route) => route.abort("failed"), { times: 1 });
    await page.getByLabel("Tirar foto").setInputFiles("public/praia.jpg");
    await expect(page.getByRole("alert")).toBeVisible();
    await page.getByLabel("Legenda (opcional)").fill("O mar");
    await page.reload();
    await page.getByRole("button",{name:"Próxima página"}).click();
    await page.getByRole("button", { name: "Abrir foto 9 de 9" }).click();
    await expect(page.getByLabel("Legenda (opcional)")).toHaveValue("O mar");
    await page.getByRole("button", {name: "Tentar novamente"}).click();
    await page.route(
      "**/api/fotos?acao=confirmar*",
      async (route) => {
        await route.fetch();
        await route.abort("failed");
      },
      { times: 1 },
    );
    await page.getByRole("button", { name: "Enviar foto" }).click();
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByText("9 de 9 fotos enviadas")).toBeVisible();
    const eventos = await f.org.client
      .from("avisos_album")
      .select("id")
      .eq("viagem_id", f.viagem);
    expect(eventos.data).toHaveLength(9);
    await page.screenshot({
      path: test.info().outputPath("album-redesenhado.png"),
    });
    await page.getByRole("button", { name: "Abrir foto 9 de 9" }).click();
    await expect(page.getByRole("img", { name: "O mar" })).toBeVisible();
    await page
      .getByLabel("Escolher da galeria")
      .setInputFiles("tests/fixtures/fotos/exemplo.heic");
    await expect(
      page.getByRole("button", { name: "Enviar foto" }),
    ).toBeVisible();
    await page.route("**/api/fotos?acao=confirmar*", (r) => r.abort("failed"), {
      times: 1,
    });
    await page.getByRole("button", { name: "Enviar foto" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.getByLabel("Legenda (opcional)").fill("Substituta");
    await page.reload();
    await page.getByRole("button",{name:"Próxima página"}).click();
    await page.getByRole("button", { name: "Abrir foto 9 de 9" }).click();
    await expect(page.getByLabel("Legenda (opcional)")).toHaveValue("Substituta");
    await expect(page.getByText(/Rascunho recuperado/)).toBeVisible();
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByText("9 de 9 fotos enviadas")).toBeVisible();
    await page.getByRole("button", { name: "Abrir foto 9 de 9" }).click();
    await expect(page.getByRole("img", { name: "Substituta" })).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("foto.png"),
      fullPage: true,
    });
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Remover foto" }).click();
    await expect(page.getByText("8 de 9 fotos enviadas")).toBeVisible();
  } finally {
    const itens = await f.admin
      .from("tentativas_foto")
      .select("id")
      .eq("viagem_id", f.viagem);
    if (itens.data?.length)
      await f.admin.storage
        .from("album-privado")
        .remove(
          itens.data.flatMap((t) => [t.id + "/foto.jpg", t.id + "/mini.jpg"]),
        );
    await f.limpar();
  }
});
