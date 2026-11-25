import { db } from "../acesso/client";
export type VagaFoto = {
  vaga:number;
  posicao: number;
  versao: number;
  legenda: string | null;
  foto: string | null;
  mini: string | null;
  cor?: string;
  amostra?: string;
};
export async function apiFotos<T>(query = "", body?: BodyInit) {
  const { data } = await db.auth.getSession();
  if (!data.session) throw Error("Entre na viagem novamente.");
  const res = await fetch("/api/fotos" + query, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: "Bearer " + data.session.access_token },
    body,
  });
  const json = await res.json();
  if(import.meta.env.VITE_SUPABASE_URL==='/servicos'){
    for(const row of Array.isArray(json)?json:[json]){
      for(const field of ['foto','mini','preview']){
        if(typeof row?.[field]==='string'){
          const u=new URL(row[field])
          if(u.pathname.startsWith('/storage/v1/object/sign/'))row[field]='/servicos'+u.pathname+u.search
        }
      }
    }
  }
  if (!res.ok)
    throw Error(json.message ?? "Falha na conexão. Tente novamente.");
  return json as T;
}
