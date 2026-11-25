create extension if not exists pg_cron;
create extension if not exists pg_net;

-- A fila só aciona a função quando há trabalho. O segredo é configurado por ambiente.
select cron.schedule('ohana-reentregar-fotos', '* * * * *', $job$
  select net.http_post(
    url := config.url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || config.token),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  from (
    select max(decrypted_secret) filter (where name = 'ohana_push_url') as url,
           max(decrypted_secret) filter (where name = 'ohana_push_token') as token
    from vault.decrypted_secrets where name in ('ohana_push_url','ohana_push_token')
  ) config
  where config.url is not null and config.token is not null
    and exists (select 1 from public.entregas_push where disponivel <= now());
$job$);
