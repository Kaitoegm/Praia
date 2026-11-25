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
    await p.goto(base + "/entrar#convite=" + token);
    await p.getByLabel("Seu nome").selectOption("3");
    await expect(
      p.getByRole("button", { name: "Entrar na viagem" }),
    ).toBeDisabled();
    await p.getByLabel("Escolher da galeria").setInputFiles("public/praia.jpg");
    await p.getByRole("button", { name: "Entrar na viagem" }).click();
    await expect(p).toHaveURL(/\/album$/);
    await expect(p.getByRole("heading", {name: /^Sua cor é .+/})).toBeVisible();
    await p.getByRole("link", { name: "Jogos", exact: true }).click();
    const anterior = await p
      .getByRole("img", { name: "Foto de Caio" })
      .getAttribute("src");
    await p.getByRole("link", { name: "Perfil", exact: true }).click();
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
    await expect(outro.locator('option[value="3"]')).toBeDisabled();
    await expect(outro.locator('option[value="1"]')).toBeDisabled();
    await p.getByRole("button", { name: "Sair da conta" }).click();
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
