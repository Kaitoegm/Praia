import { createClient } from "@supabase/supabase-js";
import { localSettings } from "../../scripts/supabase-local.mjs";

export async function prepararJogos() {
  const env = localSettings();
  const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY);
  const viagem = crypto.randomUUID();
  const ids: string[] = [];
  async function limpar() {
    await admin.from("participantes").delete().eq("viagem_id", viagem);
    await admin.from("viagens").delete().eq("id", viagem);
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
  async function perfil(vaga: number) {
    const email = viagem + "-" + vaga + "@example.test";
    const user = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (user.error) throw user.error;
    ids.push(user.data.user.id);
    const vinculo = await admin
      .from("participantes")
      .update({ usuario_id: user.data.user.id, avatar: '/ohana-192.png' })
      .eq("viagem_id", viagem)
      .eq("vaga", vaga);
    if (vinculo.error) throw vinculo.error;
    const link = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (link.error) throw link.error;
    const client = createClient(env.API_URL, env.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await client.auth.verifyOtp({
      type: "email",
      email,
      token: link.data.properties.email_otp,
    });
    if (login.error) throw login.error;
    return { client, session: login.data.session! };
  }
  try {
    const trip = await admin.from("viagens").insert({
      id: viagem,
      nome: "Jogos de verão",
      inicio: "2027-01-16",
      fim: "2027-01-22",
      fuso: "America/Sao_Paulo",
    });
    if (trip.error) throw trip.error;
    const nomes = [
      "Ana",
      "Bia",
      "Caio",
      "Davi",
      "Eva",
      "Fê",
      "Gabi",
      "Ivo",
      "Lia",
    ];
    const roster = await admin
      .from("participantes")
      .insert(
        nomes.map((nome, i) => ({
          nome,
          vaga: i + 1,
          viagem_id: viagem,
          email: viagem + "-" + (i + 1) + "@example.test",
        })),
      )
      .select();
    if (roster.error) throw roster.error;
    return {
      org: await perfil(1),
      familiar: await perfil(2),
      viagem,
      admin,
      async completarPerfil(vaga: number) {
        const user = await admin.auth.admin.createUser({
          email: viagem + "-" + vaga + "@example.test",
          email_confirm: true,
        });
        if (user.error) throw user.error;
        ids.push(user.data.user.id);
        const result = await admin
          .from("participantes")
          .update({ usuario_id: user.data.user.id, avatar: '/ohana-192.png' })
          .eq("viagem_id", viagem)
          .eq("vaga", vaga);
        if (result.error) throw result.error;
      },
      pessoas: roster.data,
      storageKey:
        "sb-" + new URL(env.API_URL).hostname.split(".")[0] + "-auth-token",
      limpar,
    };
  } catch (e) {
    await limpar();
    throw e;
  }
}
