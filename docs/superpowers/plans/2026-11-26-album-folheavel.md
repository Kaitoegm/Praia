# OHANA · Plano de implementação do álbum de viagem

**Entrega planejada para celular.** Ao tocar em Álbum, o viajante abre seu caderno na própria cor. Duas abas no topo, **Meu álbum** e **Da família**, alternam o conteúdo. No familiar, as páginas já existem antes da primeira foto. As imagens entram aos poucos, sempre no mesmo lugar. O gesto principal é puxar a folha **para a direita para avançar**. O movimento inverso volta.

**Proposta de paginação.** Uma folha visível por vez. Cada pessoa tem nove vagas em duas páginas: quatro na primeira e cinco na segunda. São 13 capítulos no livro da família, 26 páginas de conteúdo e 117 vagas. O cabeçalho faz as vezes de capa. O leitor entra diretamente nas fotos.

## 1 · Começar pela sensação de folhear

Criar um protótipo local de três folhas na área de álbum. Usar os fundos reais, quatro ou cinco fotografias de ensaio por folha e legendas de comprimentos diferentes. Implementar primeiro o gesto, antes de ligar câmera, banco ou notificações. Assim é possível ajustar o peso do papel com o mesmo conteúdo que será desenhado em produção.

- **Ao encostar.** Registrar posição, tempo e largura da folha. Um toque simples continua disponível para abrir uma foto ou a câmera. Ao identificar movimento horizontal predominante de cerca de 10 px, assumir o arrasto e suprimir o clique daquele gesto. Permitir rolagem vertical e zoom pelo navegador; reservar as bordas externas para os gestos do sistema.
- **Enquanto o dedo arrasta.** Para avançar, a borda esquerda se levanta e atravessa a tela em direção à lombada direita. A página seguinte já está pousada por baixo. A dobra afina perto do fim. Usar frente, verso de papel e uma faixa estreita de sombra com gradiente pronto. Para voltar, inverter o movimento. Evitar texto espelhado no verso. A sombra acompanha o dedo e some quando a folha assenta.
- **Ao soltar.** Partir da posição e da velocidade atuais. Como valores iniciais de ajuste, completar após 35% da largura, ou após 12% com velocidade a favor superior a 0,55 px/ms. Nos outros casos, devolver a folha ao repouso. Começar com 180–320 ms para o trecho restante. Permitir agarrar a folha novamente durante o assentamento.
- **Nos limites.** Na primeira e na última página, oferecer resistência curta e retornar. Tratar segundo dedo, rotação do celular, perda de foco e cancelamento do ponteiro. Um gesto concluído move exatamente uma página.
- **Implementação.** Em um componente proposto chamado FolhearAlbum, usar Pointer Events, captura do ponteiro, referências e uma atualização visual por requestAnimationFrame. Medir largura no início do gesto. Animar transformações e opacidade, com perspectiva restrita ao livro. Fazer a atualização React do número de página ao concluir. Aplicar will-change apenas enquanto houver movimento. [Gestures, de Emil Kowalski](https://skills.sh/emilkowalski/skills/gestures) · [Comportamento de toque no navegador](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)

**Aceite.** Um arrasto lento pode parar no meio e voltar; um gesto curto não dispara a câmera; avançar e voltar nunca pula uma folha. Com movimento reduzido, os mesmos gestos e botões trocam o conteúdo imediatamente, sem giro.

## 2 · Montar as duas páginas no tamanho do celular

Em src/features/album/MinhaCor.tsx, separar o leitor da seleção de coleção e da edição. No topo, manter o controle de dois segmentos sempre no mesmo lugar. Usar a ilustração de tucano e onda do cabeçalho com o título em texto real. Mostrar nome, cor e progresso do capítulo. No pé da folha, incluir **Anterior**, **Próxima** e o indicador de página. Os botões executam a mesma transição do gesto.

Cada arte enviada pelo organizador define a composição. Dividir a dupla pela lombada e manter as proporções, rotações, fitas e margens desenhadas. No azul-marinho, a folha 1 contém as vagas 1–4 e a folha 2 contém as vagas 5–9. Há uma moldura vertical na primeira página. As demais são horizontais. Para os próximos capítulos, medir também as molduras quadradas quando existirem.

Colocar a fotografia atrás da borda e das fitas. Usar a geometria interna da moldura para definir a área de toque, o visor, o recorte central salvo e a miniatura. Mostrar a legenda completa na leitura ampliada.

- A troca entre os dois álbuns é uma troca de contexto. Memorizar a última página de cada um durante a sessão. Manter /album e o acesso existente por /album?familia=1. Ao voltar da câmera ou fechar a foto ampliada, devolver o foco à vaga correspondente.

**Aceite.** O leitor consegue chegar à nona vaga com uma mão em 320, 390 e 430 px. Ações têm pelo menos 44 px de área de toque. Leitores de tela anunciam dono, cor e posição após a virada. Somente a página ativa entra na ordem de foco.

## 3 · Receber as artes do organizador

O organizador produzirá as duplas de páginas. Usar o azul-marinho entregue como primeira composição definitiva. Os fundos conceituais anteriores servem somente de referência. Para cada nova dupla, separar as duas páginas, registrar centro, largura, altura, rotação e ordem de cada abertura, e conferir com uma foto de ensaio. Usar a mesma composição nos álbuns pessoal e familiar.

Ordem do catálogo: Amarelo, Laranja, Vermelho, Rosa, Roxo, Azul-marinho, Turquesa, Verde, Branco, Dourado, Marrom, Azul-celeste e Cinza.

## 4 · Construir o livro compartilhado desde a primeira visita

Fixar a ordem dos capítulos pelo identificador das 13 cores existentes. Na entrada do familiar, mostrar a primeira folha na primeira visita. Oferecer um índice compacto no cabeçalho para saltar direto a uma cor, inclusive com zero fotos. Cada capítulo ganha o nome do participante quando ele recebe a cor no cadastro. Até lá, mostrar apenas a cor.

Montar as páginas a partir das vagas 1–9 e sobrepor as fotos confirmadas pela chave estável de participante e posição. Usar as atribuições reais da viagem. Se as consultas atuais omitirem cores atribuídas com zero fotos, ampliar a leitura autenticada com cor, vaga e nome necessários. Manter as permissões atuais de leitura familiar e edição individual. Publicar, substituir e excluir alteram o conteúdo da mesma moldura. Uma nova foto ou aviso recebido durante a virada atualiza a folha depois que ela assenta, sem deslocar o leitor. Ao abrir um aviso específico, resolver a página da foto pelo identificador, quando disponível, e usar o livro familiar como destino de reserva.

**Aceite.** O livro vazio tem 26 páginas navegáveis. A primeira foto pode entrar na vaga 9 sem deslocar as demais. A troca de uma foto conserva capítulo e posição. Uma publicação confirmada continua aparecendo para os demais e gerando o aviso já existente.

## 5 · Abrir a câmera com enquadramento ao vivo

Tocar em uma moldura pessoal vazia abre diretamente o visor com a proporção exata daquela abertura. A orientação, seja quadrada, vertical ou horizontal, já vem definida. A legenda aparece após o disparo.

- Criar o visor sob demanda a partir de EnviarFoto.tsx. Usar vídeo inline, sem áudio, câmera traseira preferida e permissão pedida no toque. A câmera nativa acionada por input continua como alternativa; o navegador controla seu visor. Nessa alternativa e na galeria, oferecer o corte na revisão. [Acesso à câmera na web](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- Mostrar a área que será fotografada em tamanho útil e escurecer a sobra. O formato permanece fixo durante a captura. Esperar dimensões válidas do vídeo. No disparo, derivar o retângulo de origem das dimensões reais e da mesma escala e alinhamento usados na prévia. Na câmera frontal, alinhar espelhamento da prévia e resultado.
- Renderizar o recorte uma vez no disparo e gerar um Blob. Liberar as faixas de vídeo, URLs temporárias e buffers ao concluir, cancelar, sair ou ocultar o aplicativo. Se a permissão for negada ou a câmera estiver ocupada, oferecer galeria e nova tentativa na mesma vaga.

**Aceite.** Uma marca encostada no limite do quadrado no visor aparece no mesmo limite da foto salva. Conferir cada proporção mapeada e a orientação após girar o celular. Cancelar devolve à página original com a vaga disponível.

## 6 · Revisar, salvar e acomodar as fotos anteriores

Na revisão, exibir a imagem inteira, o campo opcional de legenda no estilo do site e ações para refazer ou publicar. Para a galeria, permitir mover a foto sob a máscara e ajustar a escala antes da confirmação. Respeitar orientação EXIF e a conversão HEIC já feita em server/imagens.mjs; se o navegador não decodificar o original, usar uma prévia privada orientada para o corte e limpar a tentativa cancelada.

Reutilizar rascunho, tentativa de envio e confirmação atuais. Propagar o recorte confirmado para a imagem e sua miniatura; uma moldura CSS sozinha não salva o enquadramento. Se houver metadados novos, torná-los opcionais e tratar fotos antigas pela proporção real. Reabrir rascunhos antigos no formato original. A falha de conexão conserva recorte, legenda e vaga, e o reenvio confirma uma única publicação.

**Aceite.** Uma foto antiga vertical abre inteira. Uma nova 1:1 continua quadrada no álbum pessoal, no familiar e na ampliação. O rascunho sobrevive a fechar e reabrir a tela.

## 7 · Proteger a fluidez durante a integração

Manter o leitor leve ao crescer de zero para 117 fotos. Montar a folha atual e as duas vizinhas, carregar miniaturas próximas e pedir a foto grande somente na ampliação. Decodificar a próxima folha fora do gesto. Com rede lenta, apresentar o papel de imediato e inserir as miniaturas em espaços já reservados. Manter os pedidos separados por coleção e evitar baixar os 26 fundos ao abrir o site. Carregar o módulo de câmera somente no primeiro uso. [Práticas de desempenho em React da Vercel](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices)

**Meta proposta para a animação.** Em um aparelho de 60 Hz, usar a janela de 16,7 ms por quadro como referência. Registrar dez viradas seguidas com o livro cheio, incluindo inversão no meio do movimento, em uma compilação de produção. Comparar a proporção de quadros acima do orçamento antes e depois da arte; buscar pelo menos 95% dentro dele e investigar qualquer tarefa acima de 50 ms durante o gesto. Separar em registros distintos a primeira abertura, o folhear já aquecido e a câmera. Anotar aparelho, navegador, taxa da tela e resultado. São metas para a implementação futura.

**Ordem de entrega.** Primeiro demonstrar as três folhas animadas. Depois conectar as duas coleções e as 13 cores. Por último integrar o visor, a publicação e as notificações. Executar os cenários existentes de álbum, envio e viagem completa; acrescentar regressões para gesto cancelado, limite de capítulo e igualdade entre corte do visor e imagem final. A publicação continua sob solicitação.

## Referências de construção

- Usar design-mobile-apps e Uizze para compor e revisar quatro telas móveis: página pessoal de quatro fotos, segunda folha da família, visor 1:1 e revisão com teclado aberto. Aproveitar a marca, a tipografia e as margens do OHANA. [Uizze Mobile](https://uizze.com/?platform=Mobile)
- A busca pela find-skills identificou **Gestures**, de Emil Kowalski, para manipulação direta e continuação do movimento ao soltar o dedo. Usá-la no protótipo da etapa 1. [Skill Gestures](https://skills.sh/emilkowalski/skills/gestures)
- Para consultar a direção de arte conceitual, **Canvas Design**, da Anthropic, oferece direção de composição, espaço negativo e hierarquia. ImageGen produziu a prancha que deu origem aos fundos entregues. Preservar papel marfim, aquarela leve e a relação entre os motivos de cada par. [Skill Canvas Design](https://skills.sh/anthropics/skills/canvas-design)
