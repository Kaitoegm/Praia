alter table public.participantes drop constraint participantes_vaga_check, add check (vaga between 1 and 13);
alter table public.pontos drop constraint pontos_vaga_check, add check (vaga between 1 and 13);
alter table public.cores drop constraint cores_id_check, add check (id between 1 and 13);

insert into public.cores values
  (10,'Dourado','#bf8b24','Encontre um reflexo dourado na areia ou no mar.'),
  (11,'Marrom','#855335','Procure madeira, cascas de coco ou sementes.'),
  (12,'Azul-celeste','#79bcec','Fotografe o céu ou um objeto azul-claro.'),
  (13,'Cinza','#80868a','Explore as pedras, as nuvens e os tons da orla.');


create or replace function public.reservar_vaga(posicao integer, familiar text, endereco text) returns void
language plpgsql security definer set search_path='' as $$
declare viagem uuid := public.minha_viagem(true);
begin
  if viagem is null or posicao not between 2 and 13 then raise exception 'Vaga indisponível'; end if;
  insert into public.participantes(viagem_id,vaga,nome,email)
    values(viagem,posicao,trim(familiar),lower(trim(endereco))) on conflict(viagem_id,vaga) do nothing;
  if not exists(select from public.participantes where viagem_id=viagem and vaga=posicao and email=lower(trim(endereco))) then
    raise exception 'Vaga já reservada';
  end if;
end $$;

create or replace function public.salvar_rodada(jogo text,titulo text,pontuacoes jsonb,chave_operacao uuid)
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
  if exists(select from jsonb_each(pontuacoes) e where jsonb_typeof(e.value)<>'number'
     or e.value::text !~ '^[0-9]+$' or not exists(select from public.participantes p where p.viagem_id=viagem and p.vaga::text=e.key))
  then raise exception 'Confira os jogadores e os pontos inteiros.'; end if;
  insert into public.jogos(viagem_id,nome) values(viagem,trim(jogo))
    on conflict(viagem_id,nome) do update set nome=excluded.nome returning id into jid;
  insert into public.rodadas(id,jogo_id,titulo,autor,envio_original) values(chave_operacao,jid,trim(titulo),auth.uid(),pontuacoes);
  insert into public.pontos select chave_operacao,key::smallint,value::integer from jsonb_each_text(pontuacoes);
  return chave_operacao;
end $$;

create or replace function public.sortear_cores(viagem uuid) returns smallint[]
language plpgsql security definer set search_path='' as $$
declare resultado smallint[];
begin
  if viagem is null or viagem is distinct from public.minha_viagem(true) then raise exception 'Somente o organizador pode sortear.'; end if;
  perform 1 from public.viagens where id=viagem for update;
  select array_agg(cor_id order by vaga) into resultado from public.atribuicoes_cor where viagem_id=viagem;
  if resultado is not null then return resultado; end if;
  if exists(select 1 from public.participantes where viagem_id=viagem and usuario_id is null) then
    raise exception 'Complete todos os cadastros antes de sortear.';
  end if;
  select array_agg(id order by random()) into resultado from public.cores;
  insert into public.atribuicoes_cor(viagem_id,vaga,cor_id)
    select viagem,p.vaga,resultado[p.vaga] from public.participantes p where p.viagem_id=viagem;
  insert into public.vagas_foto(viagem_id,vaga,posicao)
    select viagem,a.vaga,i from public.atribuicoes_cor a cross join generate_series(1,9) i where a.viagem_id=viagem;
  select array_agg(cor_id order by vaga) into resultado from public.atribuicoes_cor where viagem_id=viagem;
  return resultado;
end $$;
