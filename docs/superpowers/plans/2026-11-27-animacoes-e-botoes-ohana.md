# OHANA · Plano de implementação de animações e botões

**Objetivo** — Dar identidade às interações de todas as telas do OHANA e tornar as ações fáceis de reconhecer no celular.

**Abordagem** — Reaproveitar React, CSS, Lucide e os recursos visuais do OHANA. Concentrar cada movimento em um evento reconhecível, como escolher, abrir, publicar ou salvar. Usar as animações existentes de roleta e virada como referência. Este documento define o trabalho de implementação e seus critérios de aceite.

**Referências** — [Find Animation Opportunities, de Emil Kowalski](https://skills.sh/emilkowalski/skills/find-animation-opportunities) e [Writing Plans, da Superpowers](https://skills.sh/obra/superpowers/writing-plans).

## 1. Dar aparência de botão às ações principais

**Arquivos** — `src/app/ohana.css`, `ViagemPrivada.tsx`, `ConfigurarViagem.tsx`, `MinhaCor.tsx` e `Perfil.tsx`.

- [ ] Criar as classes compartilhadas `.botao-ohana` e `.botao-ohana--secundario`, com área de toque de 44 px ou mais, foco visível, ícone opcional e resposta de pressão de 90 ms com escala de 0,97.
- [ ] Estilizar **Configurar viagem**, **Registrar pontos de um jogo** e **Abrir meu perfil** como botões visuais. Manter o elemento de link para destinos e usar botão para operações na tela. Dar acabamento secundário a **Trocar de viajante**, voltar e cancelar. Preservar o acesso administrativo.
- [ ] Conferir em `jogos.spec.ts` e `perfil.spec.ts` que os controles mantêm nome acessível, ativação por teclado e destino correto.

## 2. Entrada, perfil, roleta e barra inferior

**Arquivos** — `Entrada.tsx`, `FotoPerfil.tsx`, `Perfil.tsx`, `RoletaCor.tsx` e `ViagemPrivada.tsx`.

- [ ] Revelar a etapa da foto ao escolher um novo viajante com deslocamento de 4 px e opacidade em 150 ms. Ao escolher um arquivo, revelar o retrato em 180 ms. Manter as mensagens de erro e carregamento no local da ação.
- [ ] Após salvar o perfil, mostrar confirmação com ícone e texto. Na roleta, dar um realce curto ao selo de cor após o disco parar. Na navegação inferior, animar apenas o fundo da aba selecionada e a resposta ao toque.
- [ ] Executar `perfil.spec.ts` e `album-sorteio.spec.ts`. Conferir retorno a um perfil existente, sorteio único e foco ao navegar entre abas.

## 3. Agenda e configuração da viagem

**Arquivos** — `Agenda.tsx`, `ConfigurarViagem.tsx` e `ohana.css`.

- [ ] Realçar a data selecionada com uma transição curta de cor. Ao trocar o dia ou a atividade, revelar o cartão de horário e local com opacidade em 140 ms. Aplicar o movimento ao cartão, preservando a posição do seletor.
- [ ] Dar destaque à ação de adicionar atividade e à confirmação de salvar. Animar o ícone do seletor **Dados da viagem** ao abrir e fechar o painel. Manter o formulário disponível imediatamente ao abrir.
- [ ] Executar `agenda.spec.ts` e conferir dia vazio, troca rápida de datas, edição e cancelamento no celular.

## 4. Ranking, rodadas e pontuação

**Arquivos** — `Ranking.tsx`, `Rodada.tsx` e `ohana.css`.

- [ ] Destacar a linha cuja posição ou pontuação realmente mudou após salvar ou corrigir uma rodada. Usar um realce único de fundo por até 250 ms e manter os valores finais disponíveis imediatamente.
- [ ] Animar discretamente o ícone da rodada quando o histórico abrir. Dar confirmação visual à revisão e ao registro da rodada, com resposta imediata ao toque e estado de envio.
- [ ] Executar `jogos.spec.ts`. Conferir empates, troca de grupo no ranking e correção da pontuação pelo organizador.

## 5. Álbum, câmera, salvamento e avisos

**Arquivos** — `LivroAlbum.tsx`, `MinhaCor.tsx`, `EnviarFoto.tsx`, `AjustarFoto.tsx`, `Avisos.tsx` e `album.css`.

- [ ] Animar o indicador das abas **Minha cor** e **Da família** e dar à ficha de capítulo resposta de toque. Manter a virada sob controle do dedo. Após confirmar a publicação, realçar a moldura preenchida uma vez, com aparência de foto recém-colocada no papel.
- [ ] Ao selecionar uma imagem, revelar os controles de revisão com uma transição curta. Mostrar o estado de envio no botão e converter **Salvar foto** em ação secundária com ícone. Usar o feedback existente de progresso e erro.
- [ ] Apresentar os avisos como cartões clicáveis com ícone e seta. Ao chegar uma foto nova, animar o sino uma vez. Abrir o painel a partir da posição do sino com opacidade e deslocamento de 4 px.
- [ ] Executar `molduras.spec.ts`, `envio.spec.ts` e `viagem-completa.spec.ts`. Conferir que gestos rápidos continuam virando uma folha por vez e que um aviso abre a foto correspondente.

## 6. Revisar todas as telas e medir a fluidez

- [ ] Conferir entrada, perfil, agenda, ranking, configurações, álbum, câmera e avisos em 320×568, 390×800 e 430×800. Validar foco, contraste, ausência de rolagem lateral e acesso aos controles com texto ampliado.
- [ ] Usar principalmente opacidade e transformação, com transições comuns de 120 a 200 ms. Reservar movimentos longos para interações que já os justificam, como o sorteio. Em movimento reduzido, trocar os estados imediatamente e conservar as confirmações em texto e ícone.
- [ ] Comparar dez viradas com as 117 fotos no teste `fluidez-album.spec.ts`. Registrar percentil 95, pior intervalo e tarefas acima de 50 ms antes e depois. Conferir que a interface abre sem baixar fotos ampliadas.
- [ ] Rodar `npm.cmd run build` e a suíte dos fluxos alterados. Publicar sob solicitação.

## Resultado da implementação

Os fluxos de agenda, ranking, perfil, sorteio, envio, avisos e leitura mobile passaram nos testes automatizados. O teste de leitura percorreu 320×568, 390×800 e 430×800. O teste de molduras e o de sorteio também verificaram navegação com movimento reduzido.

No Edge com celular emulado e 117 fotos, duas séries de dez viradas registraram percentil 95 de 17,4 ms e 17,1 ms, com picos de 100,1 ms e 149,9 ms. A primeira série registrou duas tarefas acima de 50 ms e a segunda nenhuma. A referência anterior do plano do álbum registrou 16,9 ms no percentil 95 e pico de 49,8 ms. As versões intermediárias também mudaram o encaixe das artes, portanto essa comparação não isola o efeito das novas microinterações. As duas séries atuais pediram nove miniaturas na abertura e nenhuma foto ampliada durante a medição. A meta de fluidez segue aberta.
