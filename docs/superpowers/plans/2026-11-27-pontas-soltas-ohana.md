# OHANA · Plano para fechar as pontas soltas

O OHANA já tem agenda, ranking, roleta, álbum progressivo e avisos. A revisão do código e dos planos anteriores apontou três jornadas que merecem fechamento antes da viagem: entrar, publicar uma foto e encontrar a novidade. Depois, fica uma entrega de encerramento para guardar as fotos. A busca pelo Find Skills usou as [diretrizes da Vercel para interfaces web](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines) como referência para estados de erro, navegação e controles móveis. Os pontos abaixo vêm do código do OHANA e de verificações já registradas.

## 1. Proteger o acesso de administrador

**Prioridade alta.** Em `server/perfil.mjs`, o retorno pelo nome vale também para Juan, e a vaga dele libera funções administrativas. Hoje quem seleciona Juan pode assumir esse perfil em outro aparelho.

- Manter a seleção por nome para os familiares. Ao selecionar Juan num aparelho novo, pedir o convite pessoal de organizador já previsto no projeto. Validar no servidor antes de emitir a sessão.
- Incluir no Perfil a ação discreta **Trocar de viajante**, com confirmação se houver uma foto em edição. Manter os dados vinculados ao perfil e limpar apenas a sessão do aparelho.
- **Pronto quando** Juan entrar em outro celular com o convite, um familiar entrar só pelo nome e os dados de ambos permanecerem intactos ao trocar de perfil.

## 2. Fechar o caminho da foto até o álbum

**Prioridade alta.** O rascunho e o reenvio já existem. Em `EnviarFoto.tsx`, escolher o arquivo já começa a enviar uma prévia antes de o usuário decidir o corte.

- Aproveitar a prévia local para revisar a foto, ajustar o enquadramento e escrever a legenda. Preparar o envio ao tocar em **Publicar**. Reusar a conversão atual para arquivos que o celular não abre na prévia.
- Em caso de falha, mostrar **Rascunho salvo neste aparelho** com ação para retomar a mesma vaga. Ao confirmar, voltar à folha de origem e indicar a moldura preenchida.
- **Pronto quando** der para escolher uma foto, perder a conexão, reabrir a revisão com o mesmo corte e publicar uma única vez.

## 3. Completar os avisos de novas fotos

**Prioridade alta.** O sino e o envio ao navegador já existem em `Avisos.tsx` e `server/avisos.mjs`. O plano anterior registra que a entrega com a tela bloqueada ainda precisa de conferência em aparelhos físicos.

- Usar o sino como ponto único para ativar e consultar avisos. Mostrar se os avisos do aparelho estão ativos e manter a lista visível quando a permissão estiver desligada.
- Conferir que tocar num aviso abre a foto certa mesmo se o álbum estiver fechado. Quando a foto tiver sido removida, abrir a página do capítulo com uma mensagem curta.
- **Pronto quando** uma foto de um aparelho aparecer para outro, abrir na moldura correta e o resultado com a tela bloqueada estiver registrado em Android e iPhone.

## 4. Dar um destino às fotos após a viagem

**Prioridade de encerramento.** O álbum permite ampliar fotos. A revisão do código encontrou espaço para uma ação direta de exportação.

- Adicionar **Salvar foto** à ampliação, usando o arquivo privado já associado àquela moldura. Dar retorno quando o arquivo estiver pronto para salvar ou compartilhar.
- **Pronto quando** um familiar conseguir guardar a foto com o enquadramento publicado em Android e iPhone. Avaliar exportação em lote depois de validar esse caminho simples.

## Critério de entrega

Executar os itens nessa ordem e concluir cada um com um teste curto. Antes de publicar, percorrer a jornada completa com dois perfis em celulares distintos: entrar, consultar a agenda, consultar o ranking, fotografar, recuperar um rascunho, receber o aviso e abrir a foto. A agenda e o ranking entram nesse ensaio porque as funções principais já existem. O ajuste de fluidez registrado no plano do álbum entra como verificação de regressão nos aparelhos disponíveis. A publicação segue sob solicitação.
