import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const reply = (status: number, message: string) =>
    Response.json({ message }, { status, headers: cors });
  if (req.method !== "POST") return reply(405, "Método inválido");
  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") || "" },
    },
  });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { posicao, familiar, endereco } = await req.json();
    const email = endereco.trim().toLowerCase();
    const reserved = await caller.rpc("reservar_vaga", {
      posicao,
      familiar,
      endereco: email,
    });
    if (reserved.error)
      return reply(403, "Confira a vaga e os dados do familiar.");
    const bind = () => admin.rpc("vincular_acesso", { endereco: email });
    if (!(await bind()).data) {
      await admin.auth.admin.createUser({ email, email_confirm: true });
      if (!(await bind()).data)
        return reply(
          503,
          "A vaga foi reservada. Tente concluir o cadastro novamente.",
        );
    }
    return reply(200, "Acesso cadastrado.");
  } catch {
    return reply(400, "Dados inválidos.");
  }
});
