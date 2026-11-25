alter table public.participantes add column avatar text check(length(avatar)<=150000);
create table public.convites_viajante(
  hash text primary key, viagem_id uuid not null references public.viagens on delete cascade,
  organizador boolean not null default false
);
create table public.aparelho_viajante(
  viagem_id uuid not null,vaga smallint not null,hash text not null,
  primary key(viagem_id,vaga),
  foreign key(viagem_id,vaga) references public.participantes on delete cascade
);
alter table public.convites_viajante enable row level security;
alter table public.aparelho_viajante enable row level security;
revoke all on public.convites_viajante,public.aparelho_viajante from public,anon,authenticated;
create function public.assumir_perfil(viagem uuid,pos smallint,dispositivo text,identidade uuid,retrato text)
returns boolean language plpgsql set search_path='' as $$
declare dono text;
begin
  perform 1 from public.participantes where viagem_id=viagem and vaga=pos for update;
  select hash into dono from public.aparelho_viajante where viagem_id=viagem and vaga=pos;
  if dono is not null and dono<>dispositivo then return false; end if;
  if dono is null then
    if retrato is null then raise exception 'Escolha sua foto'; end if;
    insert into public.aparelho_viajante values(viagem,pos,dispositivo);
  end if;
  update public.participantes set usuario_id=identidade,avatar=coalesce(avatar,retrato) where viagem_id=viagem and vaga=pos and (usuario_id is null or usuario_id=identidade);
  if not found then raise exception 'Identidade incompatível'; end if;
  return true;
end $$;
revoke all on function public.assumir_perfil(uuid,smallint,text,uuid,text) from public,anon,authenticated;
grant execute on function public.assumir_perfil(uuid,smallint,text,uuid,text) to service_role;
