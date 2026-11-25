create table public.jogos (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.viagens on delete cascade,
  nome text not null check (trim(nome) <> ''),
  unique(viagem_id,nome)
);
create table public.rodadas (
  id uuid primary key,
  jogo_id uuid not null references public.jogos on delete cascade,
  titulo text not null check (trim(titulo) <> ''),
  autor uuid not null,
  criada_em timestamptz not null default now(),
  envio_original jsonb not null
);
create table public.pontos (
  rodada_id uuid not null references public.rodadas on delete cascade,
  vaga smallint not null check(vaga between 1 and 9),
  valor integer not null check(valor >= 0),
  primary key(rodada_id,vaga)
);
create table public.correcoes (
  id bigint generated always as identity primary key,
  rodada_id uuid not null, vaga smallint not null,
  anterior integer not null, novo integer not null,
  autor uuid not null, instante timestamptz not null default now(),
  foreign key(rodada_id,vaga) references public.pontos on delete cascade
);
-- Todas as leituras e gravações da aplicação passam pelas três funções abaixo.
alter table public.jogos enable row level security;
alter table public.rodadas enable row level security;
alter table public.pontos enable row level security;
alter table public.correcoes enable row level security;
revoke all on public.jogos,public.rodadas,public.pontos,public.correcoes from public,anon,authenticated;

create function public.salvar_rodada(jogo text,titulo text,pontuacoes jsonb,chave_operacao uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare viagem uuid:=public.minha_viagem(true); jid uuid; anterior public.rodadas;
begin
  if viagem is null then raise exception 'Somente o organizador pode lançar resultados.'; end if;
  if coalesce(trim(jogo),'')='' or coalesce(trim(titulo),'')='' or chave_operacao is null or
     jsonb_typeof(pontuacoes) is distinct from 'object' or pontuacoes='{}' then raise exception 'Preencha o jogo, a rodada e os pontos.'; end if;
  perform 1 from public.viagens where id=viagem for update;
  select * into anterior from public.rodadas where id=chave_operacao;
  if found then
    if anterior.envio_original=pontuacoes and anterior.titulo=trim(salvar_rodada.titulo) and
       exists(select from public.jogos where id=anterior.jogo_id and viagem_id=viagem and nome=trim(jogo)) then return anterior.id; end if;
    raise exception 'Esta confirmação já foi usada.';
  end if;
  if exists(select from jsonb_each(pontuacoes) e where e.key !~ '^[1-9]$' or jsonb_typeof(e.value)<>'number'
     or e.value::text !~ '^[0-9]+$' or not exists(select from public.participantes p where p.viagem_id=viagem and p.vaga::text=e.key))
  then raise exception 'Confira os jogadores e os pontos inteiros.'; end if;
  insert into public.jogos(viagem_id,nome) values(viagem,trim(jogo))
    on conflict(viagem_id,nome) do update set nome=excluded.nome returning id into jid;
  insert into public.rodadas(id,jogo_id,titulo,autor,envio_original) values(chave_operacao,jid,trim(titulo),auth.uid(),pontuacoes);
  insert into public.pontos select chave_operacao,key::smallint,value::integer from jsonb_each_text(pontuacoes);
  return chave_operacao;
end $$;

create function public.corrigir_pontos(rodada uuid,jogador smallint,esperado integer,novo_valor integer)
returns void language plpgsql security definer set search_path='' as $$
declare atual integer;
begin
  select p.valor into strict atual from public.pontos p join public.rodadas r on r.id=p.rodada_id join public.jogos j on j.id=r.jogo_id
   where j.viagem_id=public.minha_viagem(true) and r.id=rodada and p.vaga=jogador for update of p;
  if atual=novo_valor then return; end if;
  if atual is distinct from esperado then raise exception 'O resultado mudou. Atualize o histórico.'; end if;
  update public.pontos set valor=novo_valor where rodada_id=rodada and vaga=jogador;
  insert into public.correcoes(rodada_id,vaga,anterior,novo,autor) values(rodada,jogador,atual,novo_valor,auth.uid());
end $$;

create function public.historico_jogos() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'jogo',j.nome,'titulo',r.titulo,'criada_em',r.criada_em,
    'pontos',(select jsonb_object_agg(vaga,valor) from public.pontos where rodada_id=r.id),
    'correcoes',(select coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]') from public.correcoes c where c.rodada_id=r.id))
    order by r.criada_em desc,r.id),'[]')
  from public.rodadas r join public.jogos j on j.id=r.jogo_id where j.viagem_id=public.minha_viagem()
$$;
revoke all on function public.salvar_rodada(text,text,jsonb,uuid), public.corrigir_pontos(uuid,smallint,integer,integer), public.historico_jogos() from public,anon;
grant execute on function public.salvar_rodada(text,text,jsonb,uuid), public.corrigir_pontos(uuid,smallint,integer,integer), public.historico_jogos() to authenticated;
