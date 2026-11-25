# Férias na Praia · Plano de implementação

**Objetivo.** Pelo navegador do celular, cada familiar deve conseguir descobrir o próximo compromisso, conferir os pontos dos jogos e contribuir com nove fotos inspiradas na cor que tirou. São nove participantes, incluindo quem organiza a viagem. Ao final, a família terá um álbum digital com **nove coleções de nove fotos, 81 no total**.

**Primeira versão proposta.** Um site privado em português, acessado por link, com três abas fixas: **Agenda**, **Jogos** e **Álbum**. A aba Álbum reúne a missão individual e a coleção da família. A mesma conta permite ao organizador competir, enviar suas fotos e administrar a viagem.

## 1. Como a família vai usar

| Momento | O que o familiar vê e faz | O que o organizador prepara |
|---|---|---|
| Antes de sair | Entra com seu próprio acesso e consulta o primeiro dia da agenda. | Configura as datas e o fuso do destino, cadastra as nove pessoas, incluindo a si mesmo, e adiciona as primeiras atividades. |
| No início da viagem | Abre **Álbum → Descobrir minha cor**. Se tirar amarelo, por exemplo, vê a sugestão “Vale um guarda-sol, uma fruta ou um detalhe da paisagem”. | Aciona **Sortear as nove cores** uma vez. A cor acompanha a pessoa por toda a viagem. |
| Durante um jogo | Confere sua colocação e abre o resultado da rodada para entender de onde vieram os pontos. | Seleciona o jogo, identifica a rodada, informa os pontos de cada pessoa que jogou e revisa a soma antes de salvar. |
| Ao fotografar | Abre **Álbum → Minha cor**, escolhe uma vaga, tira ou seleciona a foto, confere a prévia e confirma. Vê “3 de 9 fotos enviadas” após a gravação. | Usa exatamente o mesmo fluxo para suas nove fotos. Pode acompanhar quantas faltam em cada coleção. |
| Durante a viagem | Abre **Da família** para ver as fotos confirmadas e ampliá-las com autoria e legenda. | Recebe os mesmos avisos dos demais participantes. |

**Regras da viagem.** A família define os pontos de cada jogo e os empates compartilham a colocação. Cada foto confirmada aparece no álbum coletivo e gera um aviso aos participantes. A meta é de 81 fotos.

## 2. Esquema das telas de celular

| Tela | Ordem de leitura e ação principal | Estado que precisa de tratamento |
|---|---|---|
| **Entrar** | Abrir convite → escolher nome → tirar ou selecionar foto → entrar na viagem. | O perfil mantém o retrato no ranking e permite trocá-lo durante a viagem. |
| **Agenda** | Cabeçalho com nome e período → próxima atividade com dia, hora e local → seletor de dias → programação em ordem de início. O organizador tem **Adicionar atividade** e **Editar**. | Dia livre mostra “Dia livre na praia”. Após a última atividade, continuar permitindo a consulta aos dias anteriores. |
| **Jogos** | Acesso ao histórico → classificação com posição, nome e total → destaque “Você” na própria linha. Os nove nomes aparecem desde o início. **Lançar rodada** aparece para o organizador. | Antes do primeiro jogo, mostrar todos com zero e a mensagem “O primeiro jogo ainda vai começar”. |
| **Lançar rodada** | Escolher ou criar jogo → nome da rodada → marcar quem jogou → pontos por pessoa → resumo → **Confirmar resultado**. Abrir uma rodada salva para corrigir um valor. | Campo em branco para quem jogou pede preenchimento. Zero é válido. Ao voltar para corrigir, mostrar o valor anterior. |
| **Minha cor** | Fundo suave inspirado na cor sorteada, nome da cor e grade 3 × 3 com as legendas sob as fotos. | As posições disponíveis permitem escolher imagens da câmera ou da galeria. |
| **Enviar foto** | Abrir uma vaga → câmera ou galeria → prévia → legenda opcional → **Enviar foto**. Ao concluir, voltar para a grade com a nova miniatura na mesma posição. | Durante o envio, manter prévia e estado visíveis. Em falha de rede, oferecer **Tentar novamente**. Ao trocar uma imagem, preservar a anterior até a confirmação da nova. |
| **Da família** | Fotos confirmadas em três colunas. Ao tocar, ampliar com autoria, legenda e navegação. | Mostrar a primeira contribuição assim que for confirmada e atualizar as telas abertas. |

### Direção visual e revisão

Usar a referência enviada como guia de composição. Na Agenda, o coral marca o cabeçalho e a próxima atividade ganha espaço. Em Jogos, o azul-claro emoldura uma lista que dá prioridade a nomes e pontos. No Álbum, o fundo areia deixa as cores das missões e as fotos em primeiro plano. Reservar ondas e conchas discretas para margens e rodapés. Sobre as fotos, manter os controles em superfícies opacas para que continuem legíveis ao sol.

- **Base visual sugerida.** Areia `#FAF5EA`, superfície branca, texto azul-marinho `#173448`, azul-claro `#D7EFF2` e coral `#F28C73`. Usar texto escuro sobre coral claro. Tipografia sugerida: Barlow, com alternativa sem serifa do sistema. Iniciar o corpo em 16 px e os títulos em 24 px.
- **Cores do sorteio.** Paleta inicial de amarelo, laranja, vermelho, rosa, roxo, azul-marinho, turquesa, verde e branco. Cada amostra recebe o nome por escrito. O branco recebe contorno visível. A pessoa decide como interpretar sua cor na foto.
- **Uso com uma mão.** Projetar primeiro em 390 px de largura, com margem de 16 px, alvos de toque de pelo menos 44 × 44 px e espaço reservado para a barra inferior do aparelho. A barra mantém ícone e rótulo. Formulários longos rolam até o botão mesmo com o teclado aberto.
- **Revisão do protótipo.** Montar primeiro Agenda, Jogos e Minha cor usando dados fictícios. Comparar a captura de celular com a referência e revisar a página inteira para detectar conteúdo encoberto. Depois validar envio interrompido, empate e álbum completo. Testar em 320, 390 e 430 px, com texto ampliado, foco visível e leitura em voz alta de rótulos e contadores.

## 3. Regras de negócio e permissões

| Operação | Participante | Organizador, também participante |
|---|---|---|
| Consultar agenda, ranking e histórico | Sim | Sim |
| Criar, editar ou cancelar atividade | — | Sim |
| Criar jogo, lançar e corrigir rodada | — | Sim, inclusive quando jogou |
| Realizar sorteio | — | Sim, com os nove cadastros prontos |
| Enviar, trocar ou remover foto durante a coleta | Apenas nas próprias nove vagas | Apenas nas próprias nove vagas |
| Ver progresso das nove coleções | Sim | Sim |
| Receber avisos de nova foto | Sim | Sim |
| Ver uma foto confirmada da viagem | Sim | Sim |

**Agenda.** Atividade exige título, dia e hora de início. Local, observação e hora de término são opcionais. Validar o intervalo da viagem e, quando houver término, que seja posterior ao início. Exibir horários no fuso do destino em todos os celulares. Uma atividade cancelada continua identificada na lista e sai do destaque de próxima atividade.

**Jogos.** Uma rodada pertence a um jogo e aceita um inteiro maior ou igual a zero por participante daquela rodada. A classificação soma os pontos vigentes de todas as rodadas. Exemplo de aceite: com 12, 12 e 8 pontos, as posições são 1º, 1º e 3º. Ordenar nomes alfabeticamente dentro de um empate. Se o organizador corrigir 8 para 13, essa pessoa assume o primeiro lugar. Registrar rodada, autor, horário, valor anterior e novo valor. Reenviar a confirmação da rodada deve produzir um único lançamento.

**Sorteio.** Usar uma permutação aleatória das nove cores no servidor. Gravar todas as atribuições em uma transação. Duas solicitações simultâneas ou um novo toque após perda de conexão devolvem o mesmo resultado gravado. Reabrir o site, trocar de aparelho ou revelar a cor novamente preserva a atribuição.

**Fotos e avisos.** A confirmação publica a foto na mesma viagem e registra um aviso. Uma repetição da confirmação conserva um único aviso. A substituição conta como nova publicação na mesma vaga. A remoção libera a posição. Cada autor edita sua própria coleção.

## 4. Arquitetura proposta

O diretório inicial contém a skill de design mobile e seu arquivo de controle. A estrutura abaixo constitui uma proposta para iniciar o site. Usar **React + TypeScript + Vite** no navegador e **Supabase** para sessões individuais por convite, banco PostgreSQL e armazenamento privado. Esse arranjo mantém uma única aplicação web e concentra no servidor as regras compartilhadas pelos nove celulares. [Acesso por e-mail](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [Permissões por linha](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Armazenamento privado](https://supabase.com/docs/guides/storage/buckets/fundamentals)

### Dados que precisam persistir

| Entidade | Campos e restrições centrais |
|---|---|
| Viagem e participantes | Nome, período e fuso. Nove vagas numeradas de 1 a 9, únicas por viagem, cada uma vinculada a uma identidade autenticada. Uma delas concentra a permissão de organizar. |
| Atividades | Viagem, título, início, término opcional, local, observação e estado de cancelamento. |
| Jogos, rodadas e pontos | Jogo, rodada, autor e chave única da operação. Uma linha de pontos por par rodada–participante. Histórico de correções gravado junto com a alteração. Classificação calculada a partir dos resultados. |
| Atribuições de cor | Viagem, participante, identificador de cor. Unicidade tanto de cor como de participante dentro da viagem. |
| Vagas de foto | Participante, posição de 1 a 9, chave privada do arquivo, legenda e versão. Par participante–posição único. A cor vem da atribuição do autor. |
| Tentativas de envio | Identificador da tentativa, autor, vaga, versão esperada, arquivo temporário e estado. Uma repetição da mesma tentativa devolve seu resultado. Limpar temporários expirados e substituídos após a confirmação. |

**Privacidade.** O servidor autentica o participante e limita a consulta à sua viagem. Prévia e preparação de arquivo são individuais. Fotos confirmadas e miniaturas recebem links temporários para visualização em família. O servidor guarda as chaves administrativas.

**Fluxo de envio.** A pessoa abre uma vaga. O servidor valida autoria, estado do álbum e versão da vaga, e autoriza a gravação em um caminho temporário. Na confirmação, verificar tamanho, conteúdo de imagem e possibilidade de decodificação. Gerar imagem de exibição orientada corretamente e miniatura sem metadados de localização. Gravar a referência definitiva e atualizar o contador em uma transação. Se a versão mudou em outro aparelho, mostrar a imagem atual e permitir nova escolha. O arquivo anterior só pode ser descartado após a troca bem-sucedida.

**Formatos propostos.** Receber JPEG, PNG e WebP de até 15 MB por arquivo. Prever conversão de HEIC/HEIF para JPEG no serviço de imagens e testar com uma foto real de iPhone. Se a conversão falhar, indicar como escolher uma versão JPEG, mantendo a vaga disponível. Carregar miniaturas na grade e a imagem maior só ao abrir a foto.

### Mapa de arquivos previstos

| Caminho a criar | Responsabilidade |
|---|---|
| `src/app/App.tsx` e `src/app/theme.css` | Rotas, navegação inferior, estados da sessão e estilos compartilhados. |
| `src/features/acesso/Entrada.tsx` | Seleção do nome e cadastro do retrato. |
| `src/features/agenda/Agenda.tsx` | Cronograma por dia e formulário de atividade. |
| `src/features/jogos/Ranking.tsx` e `Rodada.tsx` no mesmo diretório | Classificação, histórico, lançamento e correção. |
| `src/features/album/MinhaCor.tsx`, `EnviarFoto.tsx` e `AlbumFamilia.tsx` no mesmo diretório | Sorteio, missão individual, envio por vaga e leitura da coleção final. |
| `supabase/migrations/` | Tabelas, restrições, políticas de acesso, consultas e operações transacionais, versionadas por etapa. |
| `supabase/functions/fotos/index.ts` | Autorizar tentativas, coordenar o processamento de imagens e confirmar arquivos. Validar a biblioteca de conversão no ambiente de execução na etapa 5. |
| `tests/integracao/` e `tests/e2e/` | Regras no banco com identidades distintas e percursos completos no navegador. |

## 5. Ordem de implementação e critérios de aceite

Cada etapa termina com uma demonstração que pode ser reproduzida. Os nomes de testes e os comandos abaixo são contratos para a implementação futura.

### Etapa 1 · Entrar como uma das nove pessoas

- [ ] Criar a base web, o tema, as três rotas e os cadastros de viagem e participantes. Preparar convites e a lista de viajantes.
- [ ] Ligar as telas de entrada e saída à sessão. Usar a mesma identidade para as funções de participante e organizador.
- [ ] **Aceite** (`acesso.spec.ts`). Em dois navegadores, entrar como organizador e familiar. Ambos chegam à Agenda. Só o primeiro vê os controles administrativos. Uma conta alheia não lê dados da viagem.

### Etapa 2 · Consultar o próximo compromisso

- [ ] Implementar cadastro, edição e cancelamento, agrupamento por dia e destaque da próxima atividade futura.
- [ ] **Aceite** (`agenda.spec.ts`). Criar duas atividades no mesmo dia e uma no seguinte. Alterar o horário da segunda para antes da primeira. Reabrir a agenda em outro celular e verificar a nova ordem. Cancelar a primeira da lista e conferir o próximo destaque. Conferir um dia vazio.

### Etapa 3 · Jogar uma rodada e conferir os pontos

- [ ] Implementar `salvar_rodada(jogo, titulo, pontuacoes, chave_operacao)` como gravação atômica. Criar consulta que inclui os nove nomes, mesmo com total zero.
- [ ] Implementar formulário de revisão, histórico e correção com registro do autor. Atualizar o ranking depois de salvar e quando a aba voltar ao primeiro plano.
- [ ] **Aceite** (`ranking.spec.ts`). Reproduzir o empate e a correção da seção 3, incluindo o organizador como jogador. Repetir o mesmo envio e verificar que o total permanece correto. Conferir o resultado pela conta de outro participante.

### Etapa 4 · Sortear e revelar as nove cores

- [ ] Implementar `sortear_cores(viagem)`, a tela de espera e a revelação individual. A consulta da missão devolve cor, nove posições e contagem de fotos confirmadas.
- [ ] **Aceite** (`sorteio.spec.ts`). Com oito cadastros, a ação informa a vaga pendente. Com nove, disparar duas solicitações juntas e obter as mesmas nove atribuições únicas. Entrar novamente e conferir a cor original.

### Etapa 5 · Completar as nove vagas pelo celular

- [ ] Construir o fluxo de prévia, legenda, envio, confirmação, remoção e troca. Validar o processamento de JPEG e HEIC com arquivos de celulares reais antes de definir o serviço definitivo de conversão.
- [ ] **Aceite** (`fotos.spec.ts`). Interromper o nono envio, reconectar e tentar novamente. A contagem deve passar de 8 para 9 uma única vez. Tentar editar uma vaga alheia e uma posição 10 diretamente no serviço. Ambas devem ser recusadas. Uma troca interrompida deve deixar a foto anterior visível.

### Etapa 6 · Acompanhar o álbum da família

- [x] Exibir as fotos confirmadas e os avisos de publicação para o grupo da viagem.
- [x] **Aceite:** abrir o álbum em outra conta, confirmar a atualização e ampliar uma foto antes de completar as 81 vagas.

### Etapa 7 · Ensaiar a viagem e publicar

- [ ] Preparar uma viagem de teste com nove identidades fictícias. Executar os testes de integração das permissões e transações com `npm run test:integracao` e os percursos de navegador com `npm run test:e2e`. Os dois comandos deverão terminar com zero falhas. Executar `npm run build` e verificar a geração do site.
- [ ] No Safari de um iPhone e no Chrome de um Android, testar o percurso **entrar → consultar atividade → conferir pontos → enviar da galeria → abrir álbum**. Incluir câmera, teclado aberto, perda de sinal e retorno à página. Comparar as telas com a referência nas larguras da seção 2.
- [ ] Publicar a aplicação via HTTPS, aplicar as migrações, configurar remetente e endereço de retorno do acesso e usar o domínio final no teste. Separar os dados do ensaio dos cadastros reais.
- [ ] **Aceite para a viagem.** O organizador consegue ajustar um horário, lançar os próprios pontos e enviar uma foto usando uma única conta. Um segundo familiar vê o novo horário e o ranking, recebe a própria cor e consegue abrir o álbum final do ensaio. A viagem real começa com os nove nomes, ranking zerado e vagas de fotos vazias.

## 6. O que definir com a família antes de usar

| Quando | Decisão |
|---|---|
| Antes dos convites | Confirmar título, datas, fuso do destino e a lista dos nove nomes, identificando quem organiza. |
| Antes do sorteio | Escolher as nove cores definitivas. |
| Antes do primeiro jogo | Combinar a pontuação de cada brincadeira e se o grupo aceita colocações compartilhadas no empate. |

**Método.** A composição das telas parte da imagem enviada. As orientações locais da Uizze UI e da Design Mobile Apps guiaram a hierarquia, os estados e a revisão em celular. A skill Writing Plans, encontrada com a Find Skills e consultada na fonte, orientou o mapa de arquivos e a divisão em entregas testáveis. Este documento especifica as telas e os testes a realizar na construção. [Writing Plans no catálogo](https://skills.sh/obra/superpowers/writing-plans) · [Fonte da skill](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md)
