# Acesso local da família

O álbum compartilhado mostra as fotos confirmadas aos membros da viagem. O sino mantém os avisos dentro do site. Para receber Web Push com o site fechado, use **Notificações → Ativar no aparelho**. Em produção, use HTTPS e configure no serviço de fotos um par fixo de chaves `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`, além de `VAPID_SUBJECT` com o contato do responsável. O comando `npx web-push generate-vapid-keys` gera o par. O ambiente de desenvolvimento mantém suas próprias chaves locais. A fila de envio é gravada na mesma transação da foto e o serviço retenta entregas pendentes.

O envio de fotos usa o serviço privado Node em `/api/fotos`. Em desenvolvimento, o Vite inicia esse serviço junto com o site. Mantenha o componente Storage do Supabase local ativo. A função de cadastro de familiares continua usando o Edge Runtime. No destino de publicação, encaminhe `/api/fotos` para `node server/servir-fotos.mjs`, com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` configuradas **apenas no servidor**. Os arquivos de exibição e as miniaturas usam o bucket privado `album-privado`. A limpeza periódica remove versões substituídas e preparações abandonadas há mais de 24 horas.

Com Docker em execução, use `npx supabase start` e `node scripts/ensaio-viajantes.mjs` para preparar a lista de ensaio. As viagens real e de ensaio têm convites distintos.

Para preparar a viagem definitiva, copie `viagem.modelo.json` para um arquivo pessoal. Preencha o título, as datas no formato AAAA-MM-DD, o fuso do destino e os nove nomes na ordem em que devem aparecer. A primeira posição é a do organizador, que também participa do ranking. Use apelidos se duas pessoas tiverem o mesmo nome.

Execute `npm run viagem:validar -- caminho/viagem.json` para conferir o arquivo mesmo sem banco de dados. Depois de configurar as credenciais do Supabase de destino no servidor, execute `node scripts/ensaio-viajantes.mjs caminho/viagem.json` para cadastrar a viagem. Ao repetir o comando, mantenha o arquivo privado de convites gravado em `PraiaEnsaio/viagem.json` no diretório de dados local. Ele identifica a viagem e preserva os convites.

A entrada usa o fragmento `/entrar#convite=...`. O servidor fornece os nomes para seleção, exige foto no primeiro cadastro e reconhece o aparelho por cookie. Somente o convite do organizador permite ocupar a vaga 1. O participante edita o retrato em **Perfil**. A sessão usa Supabase Auth e o participante não precisa fornecer e-mail nem digitar código.

Para o ensaio HTTPS, compile com a chave pública do projeto em `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_URL=/servicos`. Execute `node server/previa.mjs` e encaminhe o túnel HTTPS à porta local 4188. O servidor publica apenas o build, os endpoints da aplicação e as rotas de dados necessárias ao cliente.

## Publicar o site e a API juntos

1. Aplique as migrações de `supabase/migrations` em ordem no projeto de destino. Mantenha o bucket do álbum privado.
2. No serviço de hospedagem Node com HTTPS, use `npm ci` e `npm run build`. Forneça as duas variáveis de compilação indicadas em `.env.example`. A chave pública deve pertencer ao projeto de destino.
3. No ambiente de execução, configure a URL do mesmo projeto, a chave de serviço, o par VAPID estável e o contato do organizador em formato `mailto:`. Disponibilize a pasta `dist`, o código do servidor e as dependências de produção. Execute `npm start` em um processo contínuo para manter a fila de notificações ativa. A hospedagem deve encaminhar o endereço HTTPS à porta `PORT`.
4. Abra diretamente `/album` no domínio e confira o cadastro por convite, uma troca de retrato, uma foto compartilhada e seu aviso usando uma viagem de ensaio antes de distribuir os convites definitivos.
