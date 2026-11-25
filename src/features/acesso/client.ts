import { createClient } from "@supabase/supabase-js";

export const db = createClient(
  new URL(import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321",globalThis.location?.origin ?? "http://localhost").href,
  import.meta.env.VITE_SUPABASE_ANON_KEY || "local-setup-required",
);
export type Viagem = {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  fuso: string;
};
export type Pessoa = {
  avatar?:string|null;
  vaga: number;
  nome: string;
  email?: string;
  usuario_id: string | null;
};
