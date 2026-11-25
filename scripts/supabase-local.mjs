import { execFileSync } from "node:child_process";

export function localSettings() {
  const raw = execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", "status", "-o", "env"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const env = Object.fromEntries(
    [...raw.matchAll(/^(\w+)="([^"]*)"/gm)].map((m) => [m[1], m[2]]),
  );
  if (!env.API_URL || !env.ANON_KEY || !env.SERVICE_ROLE_KEY)
    throw Error("Inicie o Supabase local antes da configuração.");
  return env;
}
