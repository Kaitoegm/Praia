create table public.viagens (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (trim(nome) <> ''),
  inicio date not null, fim date not null check (fim >= inicio),
  fuso text not null, album_liberado_em timestamptz
);
create function public.validar_fuso() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select from pg_catalog.pg_timezone_names where name=new.fuso) then
    raise exception 'Fuso desconhecido';
  end if;
  return new;
end $$;
create trigger validar_fuso before insert or update on public.viagens for each row execute function public.validar_fuso();
create table public.participantes (
  viagem_id uuid not null references public.viagens,
  vaga smallint not null check(vaga between 1 and 9),
  nome text not null check(trim(nome) <> ''),
  email text not null unique check(email=lower(trim(email)) and email like '%_@_%._%'),
  usuario_id uuid unique references auth.users,
  primary key(viagem_id,vaga)
);
-- A vaga 1 é sempre a do organizador. Identidades são vinculadas apenas pelo servidor.
create function public.minha_viagem(admin_only boolean default false) returns uuid
language sql stable security definer set search_path='' as $$
  select viagem_id from public.participantes where usuario_id=auth.uid() and (not admin_only or vaga=1)
$$;
alter table public.viagens enable row level security;
alter table public.participantes enable row level security;
revoke all on public.viagens,public.participantes from anon,authenticated;
grant select on public.viagens, public.participantes to authenticated;
grant update(nome,inicio,fim,fuso) on public.viagens to authenticated;
create policy membros on public.viagens for select to authenticated using(id=public.minha_viagem());
create policy editar on public.viagens for update to authenticated using(id=public.minha_viagem(true)) with check(id=public.minha_viagem(true));
create policy equipe on public.participantes for select to authenticated using(viagem_id=public.minha_viagem());
create function public.reservar_vaga(posicao integer, familiar text, endereco text) returns void
language plpgsql security definer set search_path='' as $$
declare viagem uuid := public.minha_viagem(true);
begin
  if viagem is null or posicao not between 2 and 9 then raise exception 'Vaga indisponível'; end if;
  insert into public.participantes(viagem_id,vaga,nome,email)
    values(viagem,posicao,trim(familiar),lower(trim(endereco))) on conflict(viagem_id,vaga) do nothing;
  if not exists(select from public.participantes where viagem_id=viagem and vaga=posicao and email=lower(trim(endereco))) then
    raise exception 'Vaga já reservada';
  end if;
end $$;
revoke all on function public.reservar_vaga(integer,text,text), public.minha_viagem(boolean) from public,anon;
grant execute on function public.reservar_vaga(integer,text,text), public.minha_viagem(boolean) to authenticated;
create function public.vincular_acesso(endereco text) returns boolean language sql security definer set search_path='' as $$
  with vinculados as (update public.participantes p set usuario_id=u.id from auth.users u
    where p.email=endereco and lower(u.email)=p.email and u.email_confirmed_at is not null
    and (p.usuario_id is null or p.usuario_id=u.id) returning p.usuario_id)
  select exists(select from vinculados)
$$;
revoke all on function public.vincular_acesso(text) from public,anon,authenticated;
grant execute on function public.vincular_acesso(text) to service_role;
