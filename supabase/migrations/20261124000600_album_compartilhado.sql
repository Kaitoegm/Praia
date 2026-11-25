create table public.avisos_album (
  id bigint generated always as identity primary key,
  viagem_id uuid not null references public.viagens on delete cascade,
  autor text not null, vaga smallint not null, posicao smallint not null,
  arquivo text unique, criado_em timestamptz not null default now()
);
alter table public.avisos_album enable row level security;
revoke all on public.avisos_album from public,anon,authenticated;
grant select on public.avisos_album to authenticated;
create policy familia on public.avisos_album for select to authenticated using(viagem_id=public.minha_viagem());
create table public.aparelhos_push (
  endpoint text primary key, usuario_id uuid not null references auth.users on delete cascade, assinatura jsonb not null
);
create table public.entregas_push (
  aviso bigint references public.avisos_album on delete cascade, endpoint text references public.aparelhos_push on delete cascade,
  disponivel timestamptz not null default now(), primary key(aviso,endpoint)
);
alter table public.aparelhos_push enable row level security;
alter table public.entregas_push enable row level security;
revoke all on public.aparelhos_push,public.entregas_push from public,anon,authenticated;
create function public.publicar_foto() returns trigger language plpgsql security definer set search_path='' as $$
declare evento bigint;
begin
  insert into public.avisos_album(viagem_id,autor,vaga,posicao,arquivo)
  select new.viagem_id,p.nome,new.vaga,new.posicao,new.arquivo from public.participantes p where (p.viagem_id,p.vaga)=(new.viagem_id,new.vaga) returning id into evento;
  if new.arquivo is not null then
    insert into public.entregas_push(aviso,endpoint) select evento,a.endpoint from public.aparelhos_push a join public.participantes p using(usuario_id) where p.viagem_id=new.viagem_id;
  end if;
  return new;
end $$;
create trigger publicar_foto after update of arquivo on public.vagas_foto for each row when(old.arquivo is distinct from new.arquivo) execute function public.publicar_foto();
create function public.proximos_push() returns table(aviso bigint,endpoint text,assinatura jsonb,autor text) language sql set search_path='' as $$
  with lote as (select e.aviso,e.endpoint from public.entregas_push e where disponivel<=now() order by disponivel limit 30 for update skip locked),
  reservadas as (update public.entregas_push e set disponivel=now()+interval '2 minutes' from lote l where (e.aviso,e.endpoint)=(l.aviso,l.endpoint) returning e.aviso,e.endpoint)
  select r.aviso,r.endpoint,a.assinatura,n.autor from reservadas r join public.aparelhos_push a using(endpoint) join public.avisos_album n on n.id=r.aviso
$$;
revoke all on function public.proximos_push() from public,anon,authenticated;
grant execute on function public.proximos_push() to service_role;
