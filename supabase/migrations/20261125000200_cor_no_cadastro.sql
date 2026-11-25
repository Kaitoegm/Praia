-- Cada perfil completo recebe sua missão na mesma transação que grava o retrato.
create function public.atribuir_cor_ao_perfil() returns trigger
language plpgsql set search_path = '' as $$
declare
  escolhida smallint;
begin
  perform 1 from public.viagens where id = new.viagem_id for no key update;
  if not exists (select 1 from public.atribuicoes_cor
                 where viagem_id = new.viagem_id and vaga = new.vaga) then
    select c.id into escolhida from public.cores c
    where not exists (select 1 from public.atribuicoes_cor a
                      where a.viagem_id = new.viagem_id and a.cor_id = c.id)
    order by random() limit 1;
    if escolhida is null then raise exception 'Nenhuma cor disponível para a viagem.'; end if;
    insert into public.atribuicoes_cor(viagem_id,vaga,cor_id,revelada_em)
    values (new.viagem_id,new.vaga,escolhida,now());
  else
    update public.atribuicoes_cor set revelada_em = now()
    where viagem_id = new.viagem_id and vaga = new.vaga and revelada_em is null;
  end if;
  insert into public.vagas_foto(viagem_id,vaga,posicao)
    select new.viagem_id,new.vaga,i from generate_series(1,9) i
    on conflict (viagem_id,vaga,posicao) do nothing;
  return new;
end $$;

create trigger perfil_com_cor after insert or update of avatar, usuario_id on public.participantes
for each row when (new.usuario_id is not null and new.avatar is not null)
execute function public.atribuir_cor_ao_perfil();

update public.participantes set avatar = avatar where usuario_id is not null and avatar is not null;

revoke execute on function public.sortear_cores(uuid) from authenticated;
revoke execute on function public.atribuir_cor_ao_perfil() from public,anon,authenticated;
