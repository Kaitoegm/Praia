insert into storage.buckets(id,name,public) values('album-privado','album-privado',false);

create table public.tentativas_foto (
  id uuid primary key, autor uuid not null, viagem_id uuid not null, vaga smallint not null,
  posicao smallint not null, versao integer not null, criada_em timestamptz not null default now(),
  pronta boolean not null default false, confirmada boolean not null default false,
  descartada boolean not null default false, limpa boolean not null default false,
  foreign key(viagem_id,vaga,posicao) references public.vagas_foto on delete cascade
);
alter table public.tentativas_foto enable row level security;
revoke all on public.tentativas_foto from public,anon,authenticated;

-- Estes comandos são internos ao servidor, que autentica o portador do token
-- e fornece o autor. O cliente só escolhe a posição dentro da própria coleção.
create function public.operar_foto(autor_id uuid, operacao text, pos integer, esperada integer,
  tentativa uuid default null, texto text default null) returns jsonb language plpgsql set search_path='' as $$
declare p public.participantes; v public.vagas_foto; t public.tentativas_foto; fechada timestamptz;
begin
  select * into strict p from public.participantes where usuario_id=autor_id;
  select album_liberado_em into fechada from public.viagens where id=p.viagem_id for update;
  select * into strict v from public.vagas_foto where viagem_id=p.viagem_id and vaga=p.vaga and posicao=pos for update;
  select * into t from public.tentativas_foto where id=tentativa for update;
  if t.id is not null then
    if (t.autor,t.posicao,t.versao) is distinct from (autor_id,pos,esperada) then raise exception 'Tentativa inválida'; end if;
    if t.confirmada and operacao='confirmar' then return '{"confirmada":true}'; end if;
    if t.descartada then raise exception 'Selecione a foto novamente'; end if;
  end if;
  if fechada is not null or esperada is distinct from v.versao then raise exception 'Coleção atualizada. Reabra a vaga.'; end if;
  if operacao='iniciar' then
    if t.id is null then
      insert into public.tentativas_foto(id,autor,viagem_id,vaga,posicao,versao) values(tentativa,autor_id,p.viagem_id,p.vaga,pos,esperada);
    end if;
    return jsonb_build_object('pronta',coalesce(t.pronta,false));
  elsif operacao='preparar' and t.id is not null then
    update public.tentativas_foto set pronta=true where id=t.id;
  elsif operacao='confirmar' and t.pronta or operacao='remover' and v.arquivo is not null then
    update public.tentativas_foto set descartada=true where id::text=v.arquivo;
    update public.vagas_foto set versao=versao+1,arquivo=case when operacao='confirmar' then t.id::text end,
      legenda=case when operacao='confirmar' then texto end where viagem_id=v.viagem_id and vaga=v.vaga and posicao=pos;
    if operacao='confirmar' then update public.tentativas_foto set confirmada=true where id=t.id; end if;
  else raise exception 'Operação indisponível'; end if;
  return '{"ok":true}';
end $$;
revoke all on function public.operar_foto(uuid,text,integer,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.operar_foto(uuid,text,integer,integer,uuid,text) to service_role;
