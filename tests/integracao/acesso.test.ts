import { expect, test } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { localSettings } from "../../scripts/supabase-local.mjs";

test("nove vagas, permissões e retomada de cadastro", async () => {
  const env = localSettings();
  const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY);
  const tag = crypto.randomUUID();
  const viagem = await admin
    .from("viagens")
    .insert({
      nome: "Ensaio",
      inicio: "2027-01-10",
      fim: "2027-01-18",
      fuso: "America/Sao_Paulo",
    })
    .select()
    .single();
  expect(viagem.error).toBeNull();
  const id = viagem.data!.id;
  const emails = Array.from(
    { length: 10 },
    (_, i) => tag + "-" + i + "@example.test",
  );
  const ids: string[] = [];
  async function login(email: string) {
    const link = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    expect(link.error).toBeNull();
    const client = createClient(env.API_URL, env.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(
      (
        await client.auth.verifyOtp({
          type: "email",
          email,
          token: link.data.properties!.email_otp,
        })
      ).error,
    ).toBeNull();
    return client;
  }
  try {
    for (const i of [0, 9]) {
      const r = await admin.auth.admin.createUser({
        email: emails[i],
        email_confirm: true,
      });
      ids.push(r.data.user!.id);
    }
    expect(
      (
        await admin
          .from("participantes")
          .insert({
            viagem_id: id,
            vaga: 1,
            nome: "Organizador",
            email: emails[0],
            usuario_id: ids[0],
          })
      ).error,
    ).toBeNull();
    const org = await login(emails[0]);
    for (let i = 1; i <= 8; i++) {
      const body = {
        posicao: i + 1,
        familiar: "Familiar " + i,
        endereco: emails[i],
      };
      expect(
        (await org.functions.invoke("cadastrar", { body })).error,
      ).toBeNull();
      if (i === 1)
        expect(
          (await org.functions.invoke("cadastrar", { body })).error,
        ).toBeNull();
    }
    const roster = await org.from("participantes").select();
    expect(roster.data).toHaveLength(9);
    ids.push(
      ...roster.data!.filter((p) => p.vaga !== 1).map((p) => p.usuario_id),
    );
    expect(
      (
        await org.rpc("reservar_vaga", {
          posicao: 10,
          familiar: "Extra",
          endereco: emails[9],
        })
      ).error,
    ).toBeTruthy();
    const member = await login(emails[1]),
      stranger = await login(emails[9]);
    expect((await member.from("viagens").select()).data).toHaveLength(1);
    expect(
      (
        await member
          .from("viagens")
          .update({ nome: "Troca" })
          .eq("id", id)
          .select()
      ).data,
    ).toEqual([]);
    expect((await stranger.from("viagens").select()).data).toEqual([]);
    expect(
      (
        await org
          .from("viagens")
          .update({ nome: "Nova viagem" })
          .eq("id", id)
          .select()
      ).data,
    ).toHaveLength(1);
  } finally {
    await admin.from("participantes").delete().eq("viagem_id", id);
    await admin.from("viagens").delete().eq("id", id);
    for (const uid of ids) await admin.auth.admin.deleteUser(uid);
  }
}, 120000);
