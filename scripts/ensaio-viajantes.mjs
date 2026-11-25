import { randomBytes, createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { banco } from "../server/fotos.mjs";
import { Temporal } from "@js-temporal/polyfill";
const validar = process.argv[2] === "--validar";
const arquivo = process.argv[validar ? 3 : 2];
if (validar && !arquivo) throw Error("Informe o arquivo de configuração da viagem.");
const entrada = arquivo
  ? JSON.parse(readFileSync(arquivo, "utf8").replace(/^\uFEFF/, ""))
  : ["Organizador", "Ana", "Bia", "Caio", "Davi", "Eva", "Gabi", "Ivo", "Lia"];
// Listas antigas conservam as datas com que essas viagens foram provisionadas.
const config = Array.isArray(entrada)
  ? { nomes: entrada, nome: arquivo ? "Férias em família" : "Ensaio da família",
      inicio: "2027-01-16", fim: "2027-01-22", fuso: "America/Sao_Paulo" }
  : entrada;
const { nomes, nome, inicio, fim, fuso } = config ?? {};
if (
  !Array.isArray(nomes) ||
  nomes.length !== 9 ||
  nomes.some((n) => typeof n !== "string" || !n.trim())
)
  throw Error("Informe nove nomes.");
if (new Set(nomes.map(n => n.trim().normalize("NFC").toLocaleLowerCase("pt-BR"))).size !== 9)
  throw Error("Use nomes ou apelidos distintos para identificar cada viajante.");
if (typeof nome !== "string" || !nome.trim()) throw Error("Informe o nome da viagem.");
for (const data of [inicio, fim]) {
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw Error("Use datas no formato AAAA-MM-DD.");
  Temporal.PlainDate.from(data);
}
if (fim < inicio) throw Error("O fim da viagem deve ser igual ou posterior ao início.");
if (typeof fuso !== "string" || !fuso.trim()) throw Error("Informe o fuso horário.");
new Intl.DateTimeFormat("pt-BR", { timeZone: fuso });
if (validar) {
  console.log(`Configuração válida: ${nome.trim()}, ${inicio} a ${fim}, ${fuso}, nove viajantes.`);
  process.exit(0);
}
const dir = join(process.env.LOCALAPPDATA || process.env.HOME, "PraiaEnsaio");
mkdirSync(dir, { recursive: true });
const path = join(dir, arquivo ? "viagem.json" : "ensaio.json");
const novo = () => randomBytes(32).toString("hex");
const dados = existsSync(path)
  ? JSON.parse(readFileSync(path, "utf8"))
  : { id: randomUUID(), familia: novo(), organizador: novo() };
if (!existsSync(path))
  writeFileSync(path, JSON.stringify(dados), { flag: "wx", mode: 0o600 });
const db = banco();
function ok(r) {
  if (r.error) throw r.error;
  return r.data;
}
ok(
  await db
    .from("viagens")
    .upsert(
      {
        id: dados.id,
        nome: nome.trim(),
        inicio,
        fim,
        fuso,
      },
      { ignoreDuplicates: true },
    ),
);
if (arquivo) {
  const salvo = ok(await db.from("viagens").select("nome,inicio,fim,fuso").eq("id", dados.id).single());
  if (salvo.nome !== nome.trim() || salvo.inicio !== inicio || salvo.fim !== fim || salvo.fuso !== fuso)
    throw Error("Os dados da viagem existente diferem do arquivo. Confira o período, o nome e o fuso.");
}
ok(
  await db.from("participantes").upsert(
    nomes.map((nome, i) => ({
      viagem_id: dados.id,
      vaga: i + 1,
      nome: nome.trim(),
      email: dados.id + "-" + (i + 1) + "@viajante.invalid",
    })),
    { onConflict: "viagem_id,vaga", ignoreDuplicates: true },
  ),
);
if (arquivo) {
  const vagas = ok(await db.from("participantes").select("vaga,nome").eq("viagem_id", dados.id).order("vaga"));
  if (vagas.length !== 9 || vagas.some(p => p.nome !== nomes[p.vaga - 1].trim()))
    throw Error("A ordem ou os nomes divergem das vagas já cadastradas. Confira a lista da viagem existente.");
}
for (const tipo of ["familia", "organizador"])
  ok(
    await db
      .from("convites_viajante")
      .upsert({
        hash: createHash("sha256").update(dados[tipo]).digest("hex"),
        viagem_id: dados.id,
        organizador: tipo === "organizador",
      }),
  );
// No ensaio de dois aparelhos, deixe os nove nomes aptos ao sorteio.
// Cada pessoa ainda escolhe a foto ao ocupar sua vaga pela primeira vez.
if (!arquivo) {
  const lista = await db
    .from("participantes")
    .select("email,usuario_id")
    .eq("viagem_id", dados.id);
  ok(lista);
  for (const p of lista.data.filter((p) => !p.usuario_id)) {
    await db.auth.admin.createUser({ email: p.email, email_confirm: true });
    const v = await db.rpc("vincular_acesso", { endereco: p.email });
    ok(v);
    if (!v.data) throw Error("Falha ao preparar uma identidade de ensaio.");
  }
}
console.log("Lista e convites preparados.");
