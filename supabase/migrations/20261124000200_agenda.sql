create table public.atividades (
  id uuid primary key,
  viagem_id uuid not null references public.viagens on delete cascade,
  titulo text not null check (trim(titulo) <> ''),
  inicio timestamptz not null,
  termino timestamptz check (termino > inicio),
  local text not null default '',
  observacao text not null default '',
  cancelada boolean not null default false
);
create index atividades_agenda on public.atividades(viagem_id,inicio,id);
create function public.validar_periodo_atividade() returns trigger language plpgsql set search_path='' as $$
declare v public.viagens;
begin
  select * into strict v from public.viagens where id=new.viagem_id;
  if (new.inicio at time zone v.fuso)::date not between v.inicio and v.fim then
    raise exception 'Escolha um dia dentro da viagem.';
  end if;
  return new;
end $$;
create trigger validar_periodo before insert or update of inicio on public.atividades for each row execute function public.validar_periodo_atividade();
alter table public.atividades enable row level security;
revoke all on public.atividades from public, anon, authenticated;
grant select, insert on public.atividades to authenticated;
grant update(titulo,inicio,termino,local,observacao,cancelada) on public.atividades to authenticated;
create policy leitura on public.atividades for select to authenticated using (viagem_id=public.minha_viagem());
create policy cadastro on public.atividades for insert to authenticated with check (viagem_id=public.minha_viagem(true));
create policy edicao on public.atividades for update to authenticated using (viagem_id=public.minha_viagem(true)) with check (viagem_id=public.minha_viagem(true));
