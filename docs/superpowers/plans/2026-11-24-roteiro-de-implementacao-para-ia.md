# Férias na Praia · Roteiro de implementação para a IA

**Entrega esperada:** um site privado que os nove familiares possam abrir pelo celular para consultar a agenda, acompanhar os jogos e montar um álbum de **81 fotos**. Cada pessoa recebe uma cor e preenche **nove posições em uma grade 3 × 3**. Quem organiza a viagem ocupa uma das nove vagas.

**Documento de produto:** leia o documento-base para conhecer as telas, as permissões, a paleta e os textos. Este roteiro define a sequência de construção e os testes que comprovam cada entrega. [Documento-base](./2026-11-24-ferias-na-praia.md)

### Instrução pronta para iniciar a construção

> Implemente o site Férias na Praia seguindo as nove etapas deste roteiro em ordem. Comece inspecionando o projeto. Use os arquivos existentes quando já cumprirem a função descrita. Para cada regra de negócio, escreva o teste, confirme que ele detecta a ausência da regra, implemente e rode-o novamente. Marque cada item após verificar o resultado. Use dados fictícios no desenvolvimento. Ao concluir, informe como abrir o site, quais testes passaram e quais verificações dependem de aparelho físico ou acesso à hospedagem.

**Ambiente proposto.** React, TypeScript e Vite para o site. Supabase local para autenticação, PostgreSQL e armazenamento privado. Vitest para integração e Playwright para navegação. Os caminhos e comandos abaixo são alvos da implementação. A etapa 1 deve criá-los quando ainda não existirem.

| Etapa | Entrega que a IA deve demonstrar | Depende de |
|---|---|---|
| 1 | Abrir a aplicação e navegar pelas três abas no celular | Documento-base |
| 2 | Entrar como organizador ou participante e configurar a viagem | 1 |
| 3 | Cadastrar um compromisso e consultá-lo no horário do destino | 2 |
| 4 | Registrar uma rodada e explicar o total de cada jogador | 2 |
| 5 | Revelar uma das nove cores e abrir as nove vagas pessoais | 2 |
| 6 | Enviar uma foto real, trocar a imagem e recuperar um envio interrompido | 5 |
| 7 | Acompanhar o álbum em construção e receber avisos | 6 |
| 8 | Ensaiar a viagem em dois perfis e verificar a experiência mobile | 3, 4 e 7 |
| 9 | Publicar a versão testada e preparar a viagem real | 8 |

## Etapa 1 · Preparar o projeto e a navegação mobile

**Arquivos principais:** `package.json`, `src/app/App.tsx`, `src/app/theme.css`, `playwright.config.ts`, `tests/e2e/navegacao.spec.ts`.

- [x] Inspecione a raiz, o gerenciador de pacotes e as configurações existentes. Se a pasta continuar sem aplicação, inicialize React + TypeScript + Vite na própria raiz, preservando os documentos e as skills. Configure os scripts `dev`, `build`, `test:integracao` e `test:e2e`. O último deve iniciar o servidor de teste pelo Playwright.
- [x] Monte as rotas `/entrar`, `/agenda`, `/jogos` e `/album`. Use uma estrutura comum com título da tela, conteúdo principal e barra inferior **Agenda · Jogos · Álbum**. Indique a aba atual por rótulo e estado acessível. Use uma sessão fictícia apenas no teste inicial de navegação.
- [x] Aplique os estilos do documento-base. Comece em 390 px. Reserve espaço para a barra inferior e a área segura do aparelho. Crie telas de exemplo com uma atividade, participantes empatados e uma grade pessoal com nove vagas numeradas.
- [x] **Verifique:** execute `npm run build` e `npm run test:e2e -- navegacao.spec.ts`. As três abas devem abrir por toque e por URL. A 320 px, a nona vaga deve ser alcançável com rolagem vertical e o último controle deve ficar acima da barra inferior.

## Etapa 2 · Criar a viagem, os convites e os dois perfis de acesso

**Arquivos principais:** `supabase/migrations/20261124000100_viagem.sql`, `src/features/acesso/Entrada.tsx`, `src/features/viagem/ConfigurarViagem.tsx`, `tests/integracao/acesso.test.ts`.

- [x] Crie `viagens` com nome, início, fim, fuso IANA e `album_liberado_em`; crie `participantes` com viagem, vaga de 1 a 9, nome e vínculo à identidade autenticada. Garanta unicidade de vaga e de identidade por viagem. Identifique um único organizador entre esses participantes. Valide fim igual ou posterior ao início.
- [x] Prepare um procedimento de configuração inicial no servidor para criar a viagem e o primeiro acesso do organizador. Na tela **Configurar viagem**, permita que ele revise datas e fuso, consulte os oito familiares da lista previamente cadastrada e acompanhe quais vagas já estão cadastradas. A criação dos acessos deve passar pelo servidor, com repetição segura se o cadastro falhar no meio.
- [x] Abrir o convite, escolher um nome em **Quem é o viajante?** e cadastrar a foto de perfil usando câmera ou galeria. Restaurar a sessão no aparelho e permitir trocar o retrato em **Perfil**. Mostrar o mesmo retrato no ranking.
- [x] Aplique políticas de acesso por linha no banco. Valide as operações administrativas também no servidor. Crie dados de teste com um organizador, oito familiares e uma identidade externa. Use contas individuais fictícias.
- [x] **Verifique:** execute `npm run test:integracao -- acesso.test.ts`. O organizador deve contar como uma das nove pessoas, a décima vaga deve ser recusada, um familiar deve conseguir consultar a viagem e a identidade externa deve receber uma recusa ao tentar lê-la. Demonstre entrada, saída e novo acesso com o mesmo perfil.

## Etapa 3 · Entregar a agenda da viagem

**Arquivos principais:** `supabase/migrations/20261124000200_agenda.sql`, `src/features/agenda/Agenda.tsx`, `tests/e2e/agenda.spec.ts`.

- [x] Crie `atividades` com viagem, título, início, término opcional, local, observação e cancelamento. Interprete a data e a hora digitadas no fuso do destino. Grave os instantes no banco e use o mesmo fuso para agrupar a programação por dia.
- [x] Implemente **Adicionar**, **Editar** e **Cancelar atividade** para o organizador. Recuse título vazio, início fora da viagem e término anterior ou igual ao início. Preserve a atividade cancelada no histórico.
- [x] Na Agenda, mostre a próxima atividade futura e, abaixo, a lista do dia selecionado. Ordene por início, indique local e cancelamento, e mostre “Dia livre na praia” no dia vazio. Atualize os dados ao voltar à aba.
- [x] **Verifique:** execute `npm run test:e2e -- agenda.spec.ts` com relógio fixo. Cadastre duas atividades, mude a ordem por edição e cancele a primeira. Uma segunda conta deve ver a nova ordem e o próximo destaque. Abra com o navegador em outro fuso e confira que a atividade continua no mesmo dia e horário do destino.

## Etapa 4 · Registrar rodadas e calcular o ranking

**Arquivos principais:** `supabase/migrations/20261124000300_jogos.sql`, `src/features/jogos/Ranking.tsx`, `src/features/jogos/Rodada.tsx`, `tests/integracao/ranking.test.ts`.

- [x] Modele jogos, rodadas, pontos e histórico de correções. Defina unicidade por rodada e participante. A operação `salvar_rodada(jogo, titulo, pontuacoes, chave_operacao)` deve gravar o resultado completo numa transação. Reutilize a chave quando o cliente repetir uma confirmação.
- [x] Monte o formulário **Jogo → Rodada → Quem jogou → Pontos → Revisar → Confirmar**. Aceite inteiros a partir de zero e exija valor para cada participante selecionado. Inclua o organizador entre os jogadores. Para corrigir, grave o novo valor junto com autor, horário e valor anterior.
- [x] Calcule os totais a partir dos resultados vigentes, incluindo quem ainda soma zero. Use classificação por competição e ordem alfabética dentro do empate. Mostre “Você” na linha da conta atual e permita abrir o histórico que explica o total.
- [x] **Verifique:** execute `npm run test:integracao -- ranking.test.ts`. Uma rodada com 12, 12 e 8 deve produzir posições 1, 1 e 3. Corrigir 8 para 13 altera o líder e cria um registro no histórico. Repetir o envio original preserva a rodada única. A tentativa de lançamento por um familiar comum deve ser recusada.

## Etapa 5 · Sortear as nove cores e iniciar as coleções

**Arquivos principais:** `supabase/migrations/20261124000400_sorteio.sql`, `src/features/album/MinhaCor.tsx`, `tests/integracao/sorteio.test.ts`.

- [x] Cadastre a paleta do documento-base, com identificador, nome legível e amostra. Crie as atribuições com unicidade de participante e de cor por viagem. Crie `vagas_foto` com chave participante–posição, posição de **1 a 9**, versão inicial e referência de arquivo inicialmente vazia.
- [x] Implemente `sortear_cores(viagem)`. Confira identidade do organizador, bloqueie a linha da viagem e exija os nove participantes. Embaralhe as nove cores no servidor e grave todas as atribuições e vagas numa transação. Se o sorteio já existir, devolva o resultado persistido.
- [x] Na aba Álbum, mostre a espera antes do sorteio e **Descobrir minha cor** depois dele. Ao revelar, exiba nome da cor, sugestão do que fotografar, “0 de 9 fotos enviadas” e nove posições em três linhas de três. Dê a cada posição um rótulo como “Adicionar foto 4 de 9”.
- [x] **Verifique:** execute `npm run test:integracao -- sorteio.test.ts`. Com oito pessoas, a operação deve indicar cadastro incompleto. Com nove, duas solicitações concorrentes devem produzir **9 atribuições distintas e 81 vagas vazias**. Reabra a missão com a mesma conta em outro navegador e confira a cor.

## Etapa 6 · Receber, substituir e remover fotos reais

**Arquivos principais:** `supabase/migrations/20261124000500_fotos.sql`, `server/fotos.mjs`, `src/features/album/EnviarFoto.tsx`, `tests/integracao/fotos.test.ts`, `tests/e2e/envio.spec.ts`.

- [x] Faça primeiro uma prova de processamento no ambiente previsto para a função. Use amostras JPEG, PNG, WebP e HEIC/HEIF. Verifique orientação, conversão para formato exibível, miniatura e remoção de metadados de localização. Se o runtime escolhido não decodificar HEIC, delegue a conversão a um serviço privado compatível e exercite o mesmo teste. Mostre orientação para selecionar JPEG quando um arquivo específico falhar.
- [x] Crie armazenamento privado e operações **iniciar envio**, **confirmar envio** e **remover foto**. A sessão determina o autor. Para iniciar, receba posição, versão esperada e identificador da tentativa. Autorize um caminho temporário exclusivo. Na confirmação, valide conteúdo, limite de 15 MB e sucesso do processamento. Somente então associe imagem e miniatura à vaga.
- [x] Na gravação final, confira novamente dono, versão e estado da viagem. Serialize atualizações da vaga na transação. Uma repetição da tentativa confirmada retorna o resultado anterior. Se a versão mudou, apresente a foto vigente e permita escolher de novo. Faça a limpeza dos objetos temporários ou substituídos depois de assegurar a versão válida.
- [x] Ligue o botão de cada vaga à câmera ou à galeria. Mostre prévia, legenda opcional e **Enviar foto**. Mantenha a prévia enquanto a página estiver aberta após falha de rede. Para trocar, conserve a imagem antiga até a nova confirmação. Para remover, peça confirmação indicando a posição que ficará livre.
- [x] **Verifique:** execute `npm run test:integracao -- fotos.test.ts` e `npm run test:e2e -- envio.spec.ts`. Com oito fotos confirmadas, interrompa e repita o envio da nona. O contador deve chegar a 9 uma única vez. Recuse a posição 10, edição de vaga alheia e arquivo acima do limite. Simule troca interrompida, remoção e leitura da imagem confirmada por outro familiar da mesma viagem.

## Etapa 7 · Álbum progressivo e notificações

- [x] Exibir fotos confirmadas para os participantes da viagem desde o primeiro envio. Usar fundo suave personalizado, título serifado, grade de três colunas e legendas abaixo das imagens.
- [x] Abrir foto ampliada com autoria e navegação. Manter a edição restrita à coleção individual.
- [x] Registrar cada publicação uma vez, atualizar as telas abertas e oferecer avisos no aparelho com permissão.
- [ ] Na homologação em aparelhos físicos, confirmar entrega Web Push com a página fechada em Android e iOS.

## Etapa 8 · Ensaiar a viagem nos celulares

**Ensaio de 25/11/2026.** Passaram os quatro testes de integração e os nove testes de navegador, incluindo navegação em 320, 390 e 430 px. Na prévia HTTPS, dois viajantes escolheram seus nomes e cadastraram retratos. Em sessões independentes com iPhone 13 emulado em WebKit e Pixel 7 emulado em Chromium, o primeiro enviou uma foto da sua cor e o segundo abriu a imagem no álbum e encontrou um aviso na central. A câmera física, o seletor nativo de galeria e a entrega de push com o site fechado ainda precisam ser conferidos nos aparelhos.

**Arquivo principal:** `tests/e2e/viagem-completa.spec.ts`. Use uma viagem de ensaio com nove identidades e fotos fictícias distinguíveis por autor e posição.

- [ ] Execute `npm run test:integracao`, `npm run test:e2e` e `npm run build` com configuração de teste. No percurso completo, mantenha duas sessões independentes. O organizador deve editar a agenda, pontuar a si mesmo e enviar fotos pela mesma conta. O familiar deve consultar o resultado, receber sua própria cor e ver as fotos de outro participante assim que confirmadas.
- [ ] Inspecione Agenda, Jogos, Minha cor e foto ampliada em 320, 390 e 430 px. Compare com a referência do documento-base. Verifique contraste, rótulos por extenso, foco visível, ampliação de texto, teclado aberto e alcance da última linha da grade. Simule carregamento lento, envio interrompido e retorno à aba.
- [ ] Em Safari no iPhone e Chrome no Android, teste câmera, galeria, orientação de imagem, seleção do nome e troca da foto de perfil e retorno ao site. Em aparelho ainda indisponível, registre o cenário pendente para a conferência física.
- [ ] **Aceite:** as suítes e a compilação terminam com código zero. Registre quais navegadores e aparelhos foram exercitados e corrija as falhas encontradas antes de usar a viagem de ensaio como referência para publicar.

## Etapa 9 · Publicar e preparar a viagem real

- [x] Preparar e ensaiar o comando de produção. Em 25/11/2026, o servidor iniciado em modo de produção respondeu às rotas diretas de agenda, jogos e álbum pelo túnel HTTPS. Com o banco de ensaio, passaram os testes de cadastro e troca de retrato e de envio de foto com aviso entre dois viajantes. O procedimento de hospedagem está em `supabase/README.md`.

**Arquivos principais:** `.env.example` para os nomes das variáveis e a configuração de hospedagem escolhida para o site. Use o ambiente definitivo quando domínio, credenciais e dados da família estiverem disponíveis.

- [ ] Aplique as migrações em ordem no ambiente de destino. Configure o armazenamento privado, a função de fotos, o processamento de imagens, os convites do organizador e da família e a URL permitida para retorno. Mantenha segredos no servidor. Distribua ao navegador apenas a configuração pública necessária.
- [ ] Publique o resultado da compilação em HTTPS. Configure a hospedagem para abrir a aplicação também ao acessar diretamente `/agenda`, `/jogos` ou `/album`. Em uma viagem de ensaio isolada, abra uma dessas URLs pelo celular, escolha um nome e cadastre uma foto, confirme uma foto, atualize a página e verifique que ela permanece na vaga.
- [ ] Quando o organizador fornecer a lista definitiva, prepare os nove nomes e os convites. Configure as datas e o fuso. Confira os nove nomes, incluindo o organizador uma única vez, as nove cores definitivas, o ranking inicial zerado e nenhuma foto confirmada. Deixe o acionamento do sorteio disponível para o início da viagem.
- [ ] **Entrega:** informe a URL verificada e como o organizador acessa **Configurar viagem**, **Lançar rodada**, **Sortear as nove cores** e **Da família**. Registre quaisquer verificações ainda pendentes com seu motivo e o ambiente em que precisam ocorrer.

### Skill usada para estruturar o roteiro

A **Writing Plans**, de `obra/superpowers`, orientou a divisão do trabalho em entregas com arquivos, dependências e verificações reproduzíveis. Para reutilizá-la no projeto, o comando publicado é `npx skills add https://github.com/obra/superpowers --skill writing-plans`. [Catálogo da skill](https://skills.sh/obra/superpowers/writing-plans) · [Instruções na fonte](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md)
