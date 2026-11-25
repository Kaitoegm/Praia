create table public.cores (
  id smallint primary key check (id between 1 and 9),
  nome text not null unique, amostra text not null, sugestao text not null
);
insert into public.cores values
  (1,'Amarelo','#f4ca40','Procure um guarda-sol, uma fruta ou um raio de sol na areia.'),
  (2,'Laranja','#f28844','Capture o pôr do sol, uma boia ou um suco de laranja.'),
  (3,'Vermelho','#d34a48','Encontre uma cadeira de praia, uma flor ou um detalhe do calçadão.'),
  (4,'Rosa','#e69cb1','Procure uma saída de praia, uma flor ou um sorvete de morango.'),
  (5,'Roxo','#8454a0','Observe o açaí, as estampas e as últimas cores do entardecer.'),
  (6,'Azul-marinho','#193954','Procure o azul profundo nos barcos, nas cangas e no horizonte.'),
  (7,'Turquesa','#40b9af','Explore os tons da água, de uma prancha ou de uma piscina.'),
  (8,'Verde','#528358','Fotografe as folhas do coqueiro, um coco ou a vegetação da orla.'),
  (9,'Branco','#ffffff','Capture a espuma de uma onda, uma nuvem ou uma concha.');
create table public.atribuicoes_cor (
  viagem_id uuid not null, vaga smallint not null, cor_id smallint not null references public.cores,
  revelada_em timestamptz,
  primary key (viagem_id,vaga), unique(viagem_id,cor_id),
  foreign key(viagem_id,vaga) references public.participantes on delete cascade
);
create table public.vagas_foto (
  viagem_id uuid not null, vaga smallint not null, posicao smallint not null check(posicao between 1 and 9),
  versao integer not null default 0, arquivo text, legenda text,
  primary key(viagem_id,vaga,posicao),
  foreign key(viagem_id,vaga) references public.atribuicoes_cor on delete cascade
);
alter table public.cores enable row level security;
alter table public.atribuicoes_cor enable row level security;
alter table public.vagas_foto enable row level security;
revoke all on public.cores,public.atribuicoes_cor,public.vagas_foto from public,anon,authenticated;

create function public.sortear_cores(viagem uuid) returns smallint[]
language plpgsql security definer set search_path='' as $$
declare resultado smallint[];
begin
  if viagem is null or viagem is distinct from public.minha_viagem(true) then raise exception 'Somente o organizador pode sortear.'; end if;
  perform 1 from public.viagens where id=viagem for update;
  select array_agg(cor_id order by vaga) into resultado from public.atribuicoes_cor where viagem_id=viagem;
  if resultado is not null then return resultado; end if;
  if (select count(usuario_id) from public.participantes where viagem_id=viagem) <> 9 then
    raise exception 'Complete os nove cadastros antes de sortear.';
  end if;
  select array_agg(id order by random()) into resultado from public.cores;
  insert into public.atribuicoes_cor(viagem_id,vaga,cor_id)
    select viagem,p.vaga,resultado[p.vaga] from public.participantes p where p.viagem_id=viagem;
  insert into public.vagas_foto(viagem_id,vaga,posicao)
    select viagem,a.vaga,i from public.atribuicoes_cor a cross join generate_series(1,9) i where a.viagem_id=viagem;
  return resultado;
end $$;

create function public.revelar_minha_cor() returns void language sql security definer set search_path='' as $$
  update public.atribuicoes_cor a set revelada_em=coalesce(revelada_em,now())
    from public.participantes p where p.usuario_id=auth.uid() and (p.viagem_id,p.vaga)=(a.viagem_id,a.vaga)
$$;
create function public.missao_album() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'cadastros',(select count(usuario_id) from public.participantes where viagem_id=p.viagem_id),
    'sorteada',a.cor_id is not null,
    'cor',case when a.revelada_em is not null then to_jsonb(c) end,
    'vagas',(select coalesce(jsonb_agg(jsonb_build_object('posicao',posicao,'confirmada',arquivo is not null) order by posicao),'[]')
      from public.vagas_foto where viagem_id=p.viagem_id and vaga=p.vaga),
    'colecoes',case when a.revelada_em is not null then (select jsonb_agg(jsonb_build_object(
      'nome',m.nome,'cor',pal.nome,'amostra',pal.amostra,'quantidade',(select count(arquivo) from public.vagas_foto f where (f.viagem_id,f.vaga)=(m.viagem_id,m.vaga))) order by pal.id)
      from public.participantes m join public.atribuicoes_cor ac using(viagem_id,vaga) join public.cores pal on pal.id=ac.cor_id where m.viagem_id=p.viagem_id) else '[]' end)
  from public.participantes p left join public.atribuicoes_cor a using(viagem_id,vaga) left join public.cores c on c.id=a.cor_id where p.usuario_id=auth.uid()
$$;
revoke all on function public.sortear_cores(uuid),public.revelar_minha_cor(),public.missao_album() from public,anon;
grant execute on function public.sortear_cores(uuid),public.revelar_minha_cor(),public.missao_album() to authenticated;
