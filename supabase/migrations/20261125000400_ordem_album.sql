create function public.fotos_familia(viagem uuid)
returns table(vaga smallint, posicao smallint, versao integer, arquivo text, legenda text, cor text, amostra text)
language sql stable security invoker set search_path='' as $$
  select f.vaga, f.posicao, f.versao, f.arquivo, f.legenda, c.nome, c.amostra
  from public.vagas_foto f
  join public.atribuicoes_cor a using (viagem_id,vaga)
  join public.cores c on c.id=a.cor_id
  left join public.avisos_album n on n.arquivo=f.arquivo and n.viagem_id=f.viagem_id
  where f.viagem_id=viagem and f.arquivo is not null
  order by n.criado_em desc nulls last, n.id desc nulls last, f.vaga, f.posicao
$$;
revoke all on function public.fotos_familia(uuid) from public,anon,authenticated;
grant execute on function public.fotos_familia(uuid) to service_role;
