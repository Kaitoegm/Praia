import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { localSettings } from "./supabase-local.mjs";

// Configuração local de desenvolvimento. Somente a chave pública segue para o Vite.
const env = localSettings();
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY);
const email =
  process.argv[2]?.toLowerCase().trim() || "organizador@example.test";
const nome = process.argv[3] || "Organizador";
const id = "00000000-0000-4000-8000-000000000001";
function assert(result) {
  if (result.error) throw result.error;
  return result.data;
}
assert(
  await admin
    .from("viagens")
    .upsert(
      {
        id,
        nome: "Férias em família",
        inicio: "2027-01-16",
        fim: "2027-01-22",
        fuso: "America/Sao_Paulo",
      },
      { onConflict: "id", ignoreDuplicates: true },
    ),
);
assert(
  await admin
    .from("participantes")
    .upsert(
      { viagem_id: id, vaga: 1, nome, email },
      { onConflict: "viagem_id,vaga", ignoreDuplicates: true },
    ),
);
const atual = assert(
  await admin
    .from("participantes")
    .select("email")
    .eq("viagem_id", id)
    .eq("vaga", 1)
    .single(),
);
if (atual.email !== email) throw Error("Esta viagem já tem outro organizador.");
if (!assert(await admin.rpc("vincular_acesso", { endereco: email }))) {
  assert(await admin.auth.admin.createUser({ email, email_confirm: true }));
  if (!assert(await admin.rpc("vincular_acesso", { endereco: email })))
    throw Error("Vínculo pendente.");
}
// Arquivo específico do modo development, reservado para as configurações públicas locais.
writeFileSync(
  ".env.development.local",
  "VITE_SUPABASE_URL=" +
    env.API_URL +
    "\nVITE_SUPABASE_ANON_KEY=" +
    env.ANON_KEY +
    "\n",
);
console.log("Organizador local preparado:", email);
