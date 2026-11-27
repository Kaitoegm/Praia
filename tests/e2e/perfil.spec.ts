import { test, expect,devices } from "@playwright/test";
import { randomBytes, createHash } from "node:crypto";
import { prepararJogos } from "../fixtures/jogos";

test("selecionar nome com foto, trocar pelo perfil e preservar a vaga", async ({
  browser,
}) => {
  test.setTimeout(100000)
  const f = await prepararJogos(),
    token = randomBytes(32).toString("hex");
  const base = process.env.PRAIA_TEST_ORIGIN || "http://127.0.0.1:4174";
  try {
    const invite = await f.admin
      .from("convites_viajante")
      .insert({
        hash: createHash("sha256").update(token).digest("hex"),
        viagem_id: f.viagem,
        organizador: false,
      });
    expect(invite.error).toBeNull();
    const p = await browser.newPage(devices[browser.browserType().name()==='webkit'?'iPhone 13':'Pixel 7']);
    let buscasFamilia = 0;
    p.on("request", req => {
      if (new URL(req.url()).searchParams.get("colecao") === "familia") buscasFamilia++;
    });
    await p.goto(base + "/entrar#convite=" + token);
    await p.getByLabel("Seu nome").selectOption("3");
    await expect(
      p.getByRole("button", { name: "Entrar na viagem" }),
    ).toBeDisabled();
    await p.getByLabel("Escolher da galeria").setInputFiles("public/praia.jpg");
    await p.getByRole("button", { name: "Entrar na viagem" }).click();
    await expect(p.getByRole("heading",{name:"Sua cor da viagem"})).toBeVisible();
    await expect(p.locator(".sorteio-disco canvas")).toBeVisible();
    await p.getByRole("button",{name:"Continuar na viagem"}).waitFor();
    const corRevelada = await p.locator(".sorteio-entrada [role=status]").innerText();
    await p.getByRole("button",{name:"Continuar na viagem"}).click();
    const guia = p.locator(".tucano-tour");
    await expect(guia.locator("img")).toHaveAttribute("src", "/tucano-conversa.webp");
    await guia.getByRole("button", {name:"Começar passeio"}).click();
    await expect(guia.locator("img")).toHaveAttribute("src", "/tucano-aponta.webp");
    await p.getByRole("link", {name:"Agenda",exact:true}).click();
    await expect(guia.getByRole("heading", {name:"Jogos"})).toBeVisible();
    await p.getByRole("link", {name:"Jogos",exact:true}).click();
    await expect(guia.getByRole("heading", {name:"Seu álbum"})).toBeVisible();
    await p.getByRole("link", {name:"Álbum",exact:true}).click();
    await expect(guia.getByRole("heading", {name:"Álbum da família"})).toBeVisible();
    await expect(p.locator('[data-guia="da-familia"]')).toHaveClass(/driver-active-element/);
    await p.getByRole("button", {name:"Da família",exact:true}).click();
    await expect(guia.getByRole("heading", {name:"Avisos de novas fotos"})).toBeVisible();
    await p.getByRole("button", {name:"Notificações",exact:true}).click();
    await expect(guia.getByRole("heading", {name:"Boa viagem!"})).toBeVisible();
    await guia.getByRole("button", {name:"Concluir"}).click();
    await p.getByRole("button", {name:"Fechar notificações"}).click();
    await p.getByRole("button", {name:"Minha cor",exact:true}).click();
    await expect(guia).toHaveCount(0);
    await expect(p.locator(".postal-cor h1")).toContainText(corRevelada);
    await expect(p).toHaveURL(/\/album$/);
    await expect(p.getByRole("heading", {name: /^Sua cor é .+/})).toBeVisible();
    await p.getByRole("link", { name: "Jogos", exact: true }).click();
    expect(buscasFamilia).toBeGreaterThan(0);
    const inicioDocumento = await p.evaluate(() => performance.timeOrigin);
    const anterior = await p
      .getByRole("img", { name: "Foto de Caio" })
      .getAttribute("src");
    await p.getByRole("link", { name: "Perfil", exact: true }).click();
    await p.goBack();
    await expect(p.getByRole("heading", { name: "Ranking dos jogos" })).toBeVisible();
    await p.goForward();
    await expect(p.getByLabel("Tirar foto")).toBeAttached();
    expect(await p.evaluate(() => performance.timeOrigin)).toBe(inicioDocumento);
    await p
      .getByLabel("Tirar foto")
      .setInputFiles("tests/fixtures/fotos/exemplo.heic");
    await p.getByRole("button", { name: "Salvar foto" }).click();
    await expect(p.getByText("Foto de perfil atualizada.")).toBeVisible();
    await p.getByRole("link", { name: "Jogos", exact: true }).click();
    await expect(
      p.getByRole("img", { name: "Foto de Caio" }),
    ).not.toHaveAttribute("src", anterior!);
    const outro = await browser.newPage();
    await outro.goto(base + "/entrar#convite=" + token);
    await outro.getByLabel("Seu nome").selectOption("1");
    await expect(outro.getByLabel("Senha do organizador")).toBeVisible();
    const negado = await outro.request.post(base + "/api/perfil?vaga=1");
    expect(negado.status()).toBe(403);
    await outro.getByLabel("Seu nome").selectOption("3");
    await outro.getByRole("button", { name: "Entrar na viagem" }).click();
    await outro.getByRole("link", { name: "Perfil", exact: true }).click();
    await expect(outro.getByRole("heading", {name: "Caio", exact:true})).toBeVisible();
    await p.evaluate((key) => localStorage.removeItem(key), f.storageKey);
    await p.goto(base + "/entrar");
    await p.getByLabel("Seu nome").selectOption("3");
    await p.getByRole("button", { name: "Entrar na viagem" }).click();
    await expect(
      p.getByRole("link", { name: "Perfil", exact: true }),
    ).toBeVisible();
    const extra = await f.admin
      .from("participantes")
      .select("usuario_id")
      .match({ viagem_id: f.viagem, vaga: 3 })
      .single();
    await f.admin
      .from("participantes")
      .update({ usuario_id: null })
      .match({ viagem_id: f.viagem, vaga: 3 });
    if (extra.data?.usuario_id)
      await f.admin.auth.admin.deleteUser(extra.data.usuario_id);
    await p.close();
    await outro.close();
  } finally {
    await f.limpar();
  }
});
