import { test, expect, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localSettings } from "../../scripts/supabase-local.mjs";

test("agenda compartilhada no fuso do destino", async ({ browser }) => {
  test.setTimeout(100000);
  const env = localSettings();
  const server = createClient(env.API_URL, env.SERVICE_ROLE_KEY);
  const viagem = crypto.randomUUID();
  const users: string[] = [],
    contexts: BrowserContext[] = [];
  try {
    expect(
      (
        await server
          .from("viagens")
          .insert({
            id: viagem,
            nome: "Viagem de teste",
            inicio: "2027-01-16",
            fim: "2027-01-18",
            fuso: "America/Sao_Paulo",
          })
      ).error,
    ).toBeNull();
    async function entrar(vaga: number, timezoneId: string) {
      const email = crypto.randomUUID() + "@example.test";
      const user = await server.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      const uid = user.data.user!.id;
      users.push(uid);
      expect(
        (
          await server
            .from("participantes")
            .insert({
              viagem_id: viagem,
              vaga,
              nome: "Pessoa " + vaga,
              email,
              usuario_id: uid,
            })
        ).error,
      ).toBeNull();
      const link = await server.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      const client = createClient(env.API_URL, env.ANON_KEY, {
        auth: { persistSession: false },
      });
      const login = await client.auth.verifyOtp({
        type: "email",
        email,
        token: link.data.properties!.email_otp,
      });
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 800 },
        timezoneId,
      });
      contexts.push(ctx);
      await ctx.addInitScript(
        ({ key, session }) =>
          localStorage.setItem(key, JSON.stringify(session)),
        {
          key:
            "sb-" + new URL(env.API_URL).hostname.split(".")[0] + "-auth-token",
          session: login.data.session,
        },
      );
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date("2027-01-16T03:00:00Z"));
      await page.goto("http://127.0.0.1:4174/agenda");
      return { page, client };
    }
    const { page } = await entrar(1, "America/Sao_Paulo");
    const { page: family, client } = await entrar(2, "Asia/Tokyo");
    async function criar(titulo: string, inicio: string) {
      await page.getByRole("button", { name: "Adicionar atividade" }).click();
      await page.getByLabel("Título").fill(titulo);
      await page.getByLabel("Início").fill(inicio);
      await page.getByLabel("Local", { exact: true }).fill("Praia central");
      await page.getByRole("button", { name: "Salvar atividade" }).click();
      await expect(
        page.locator("article").filter({ hasText: titulo }),
      ).toBeVisible();
    }
    await criar("Vôlei", "2027-01-16T19:00");
    await criar("Jantar", "2027-01-16T20:00");
    await criar("Passeio", "2027-01-17T09:00");
    await page.getByRole("button", { name: "16 de janeiro" }).click();
    await page.getByLabel("Atividade do dia").selectOption({label:"20:00 · Jantar"});
    await page
      .locator("article")
      .filter({ hasText: "Jantar" })
      .getByRole("button", { name: "Editar" })
      .click();
    await page.getByLabel("Início").fill("2027-01-16T18:30");
    await page.getByRole("button", { name: "Salvar atividade" }).click();
    await expect(page.locator("article").first()).toContainText("Jantar");
    await family.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(family.locator("article").first()).toContainText("18:30");
    await expect(family.locator(".proxima")).toContainText("Jantar");
    await family.screenshot({
      path: test.info().outputPath("agenda-familiar.png"),
      fullPage: true,
    });
    await expect(family.getByRole("button", { name: "Editar" })).toHaveCount(0);
    const data = {
      id: crypto.randomUUID(),
      viagem_id: viagem,
      titulo: "Extra",
      inicio: "2027-01-16T12:00:00Z",
    };
    expect((await client.from("atividades").insert(data)).error).toBeTruthy();
    await page
      .locator("article")
      .first()
      .getByRole("button", { name: "Editar" })
      .click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Cancelar atividade" }).click();
    await expect(page.locator(".proxima")).toContainText("Vôlei");
    await expect(page.locator("article").first()).toContainText("Cancelada");
    await family.reload();
    await expect(family.locator(".proxima")).toContainText("Vôlei");
    await family.getByRole("button", { name: "18 de janeiro" }).click();
    await expect(family.getByText("Dia livre na praia.")).toBeVisible();
    expect(
      (
        await server
          .from("atividades")
          .insert({ ...data, inicio: "2027-01-20T12:00:00Z" })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await server
          .from("atividades")
          .insert({ ...data, termino: data.inicio })
      ).error,
    ).toBeTruthy();
  } finally {
    for (const ctx of contexts) await ctx.close();
    await server.from("participantes").delete().eq("viagem_id", viagem);
    await server.from("viagens").delete().eq("id", viagem);
    for (const id of users) await server.auth.admin.deleteUser(id);
  }
});
