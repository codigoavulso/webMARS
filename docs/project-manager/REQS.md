# REQS — modelo do produto e requisitos

## 1. Filosofia do produto

### 1.1 O utilizador trabalha em projetos, não em mecanismos de armazenamento

Um projeto é uma unidade de trabalho com nome, identidade, ficheiros, pastas e configuração de execução. Pode existir apenas neste navegador ou ter uma cópia privada ligada à Cloud. Não é uma pasta real do Windows, não é um separador e não é uma publicação.

O projeto mantém a mesma identidade ao ser renomeado, fechado, reaberto ou sincronizado. O nome serve para reconhecimento humano; nunca para decidir que duas cópias são o mesmo trabalho.

### 1.2 Um ficheiro existe independentemente de estar aberto

O repositório do projeto é a fonte de verdade. Separadores, cursor, seleção, scroll e histórico do editor são estado de trabalho, separado dos ficheiros. É possível ter um projeto com vinte ficheiros e abrir apenas dois. Fechar os dois deixa os vinte intactos.

### 1.3 Guardar, descarregar, sincronizar e publicar são verbos diferentes

| Ação | Significado |
|---|---|
| Guardar | Confirmar alterações no armazenamento local do projeto. |
| Descarregar ficheiro | Obter uma cópia num ficheiro do computador; não renomear nem mover o original. |
| Exportar projeto | Obter uma cópia transportável e reimportável do projeto. |
| Guardar na Cloud / Sincronizar | Atualizar explicitamente a cópia privada ligada ao projeto. |
| Publicar | Criar uma publicação ou uma nova revisão imutável com conteúdo selecionado e metadados. |
| Fechar | Sair da vista ou do projeto; não eliminar conteúdo. |
| Mover para a reciclagem | Retirar um item do conjunto ativo, com possibilidade de restauro. |

Não apresentar uma ação genérica «Guardar» que faça downloads ou publique em função de contexto oculto. O destino tem de ser previsível pelo nome da ação e pelo estado visível.

### 1.4 A Cloud é opcional; uma publicação não é uma pasta partilhada

A app continua útil sem conta, sem rede e sem BackMars. Uma publicação é um instantâneo independente de um projeto privado, não uma alteração de permissões desse projeto. «Não listado» significa acessível a quem tem a ligação; não significa privado. O conteúdo publicado nunca volta a ser privado por se eliminar a cópia de trabalho.

### 1.5 Um sistema comum, sem fingir que tudo suporta as mesmas ações

Navegação, seleção, tabelas, pré-visualização, pesquisa e mensagens são comuns. As permissões e os verbos variam conforme o recurso. Uma publicação de outra pessoa permite consultar e criar cópia; nunca editar o original. Consistência não é mostrar ações impossíveis em todos os lugares.

### 1.6 Segurança do trabalho antes de automatismos

Uma falha de rede não significa catálogo vazio. Uma escrita ainda em memória não significa «Guardado». Uma cópia com o mesmo nome não significa «Sincronizado». Atualizar a lista não deve mudar o projeto ativo nem fechar ficheiros. O sistema deve explicar o próximo passo, sem expor URLs internas ou detalhes da implementação.

## 2. Conceitos e invariantes

| Conceito | Identidade e responsabilidade |
|---|---|
| Projeto local | UUID persistente; conteúdo local canónico, independente do nome. |
| Ficheiro / pasta | ID estável dentro do projeto; caminho relativo é localização, não identidade. |
| Cópia Cloud | ID remoto + instalação + conta proprietária; ligação explícita a um UUID local. |
| Publicação | Identidade da instalação + slug permanente; autoria e visibilidade próprias. |
| Revisão publicada | Publicação + número; conteúdo e metadados congelados. |
| Origem de uma cópia | Referência informativa ao exemplo/publicação/revisão que a originou; não constitui ligação de sincronização. |
| Sessão do editor | Projetos/separadores abertos, ficheiro ativo e posição de leitura; não define o conteúdo existente. |

**INV-01** Fechar separadores ou o projeto nunca remove ficheiros.

**INV-02** Selecionar uma linha não abre, ativa, descarrega, publica ou altera um projeto.

**INV-03** Uma alteração local é atómica: conteúdo, caminhos, referências e índices são confirmados juntos ou ficam como estavam.

**INV-04** Renomear mantém IDs, ligação Cloud, seleção e associação às publicações.

**INV-05** Não há correspondência automática de identidade por nome, caminho de raiz ou data.

**INV-06** Sincronização e publicação só incluem ficheiros do projeto, nunca outros separadores, bibliotecas globais ou dados de conta.

**INV-07** O servidor valida permissões, formato, limites e concorrência; botões desativados não são controlo de acesso.

**INV-08** Repetir uma operação de rede após timeout não cria duplicados nem duas revisões.

## 3. Âmbito obrigatório

Os requisitos seguintes são obrigatórios para esta entrega. A prioridade indica ordem de implementação; não permite declarar o trabalho concluído omitindo os últimos.

### P0 — propriedade dos dados e previsibilidade

- **DATA-01** Separar catálogo de projetos, conteúdo do projeto e sessão do editor. Fechar tudo pode deixar o editor sem separadores; não criar ficheiros artificiais para preencher a janela.
- **DATA-02** Permitir projeto vazio e pastas vazias. Compilar/montar ficam indisponíveis sem uma fonte adequada. Publicar exige pelo menos um ficheiro suportado.
- **DATA-03** Guardar localmente de forma automática, com debounce de 500 ms após edição; Ctrl+S confirma imediatamente todos os buffers alterados do projeto ativo. A interface distingue «A guardar», «Guardado neste dispositivo» e «Não foi possível guardar».
- **DATA-04** Só limpar o indicador de alterações após confirmação da escrita. Um download ou sincronização não limpa alterações mais recentes do buffer. Se a persistência falhar, manter o buffer editável e oferecer Exportar/Tentar novamente.
- **DATA-05** Registos privados e filas Cloud são associados à instalação e à conta. Mudar de conta nunca envia projetos pendentes para outra conta. Sair da conta não apaga o trabalho local; o texto deve deixar claro que a cópia local permanece neste navegador.
- **DATA-06** Preservar todos os projetos, ficheiros, pastas, estados guardados e configurações existentes durante a migração. Dados inválidos são apresentados para recuperação, nunca ignorados silenciosamente.
- **DATA-07** Resolver operações por ID. Nomes duplicados locais são permitidos; a UI desambigua por localização/estado. Na Cloud, respeitar a unicidade de nomes já existente por conta e pedir um novo nome no conflito, sem ligar ao homónimo.

### P0 — ficheiros e projetos

- **FILE-01** Criar projeto vazio ou a partir de modelo; criar ficheiro e pasta; abrir, renomear, duplicar, mover, copiar, descarregar e enviar para reciclagem.
- **FILE-02** Seleção múltipla com Ctrl/Cmd, Shift e caixas de seleção. A barra contextual apresenta quantidade e ações válidas para o conjunto. Não executar uma ação sobre um item oculto deixado por uma pesquisa anterior.
- **FILE-03** Copiar/mover dentro e entre projetos locais, por menu e por arrastar. O arrastar é complementar; todas as operações existem por teclado/toque. Destino e efeito são explícitos. Entre projetos, pedir Copiar/Mover; nunca mover de forma implícita.
- **FILE-04** Numa colisão, oferecer Manter ambos, Substituir e Cancelar; em lote, Aplicar aos restantes. «Ignorar» só quando fizer sentido num lote. Substituir exige confirmação e retém a versão anterior na reciclagem. Uma operação cancelada não deixa um lote meio aplicado.
- **FILE-05** Mover/renomear uma pasta atualiza todos os caminhos descendentes numa transação. Impedir ciclos e destino dentro da própria pasta. Atualizar referências internas por ID e avisar sobre includes estáticos afetados. Não fazer substituição cega no texto do programa.
- **FILE-06** Fechar um ficheiro fecha apenas o separador; Fechar projeto fecha os seus separadores. Ao abrir outro projeto, guardar primeiro alterações locais e cancelar a mudança se isso falhar. Manter um só projeto de trabalho ativo nesta entrega.
- **FILE-07** Separar bibliotecas fornecidas pela app, fontes do projeto e resultados gerados. As bibliotecas continuam só de leitura, com «Copiar para o projeto». Resultados Mini-C não devem tornar-se fontes editáveis/publicadas sem uma ação explícita.
- **FILE-08** Importar ficheiros e pastas de disco, com alternativa compatível com Firefox quando não houver API de diretórios. Antes de escrever, mostrar árvore, colisões, rejeições e tamanhos. Manter os formatos de importação/exportação já suportados; acrescentar pacote de projeto documentado, preservando pastas vazias e IDs.
- **FILE-09** Validar caminhos relativos e unicidade em ambos os lados: NFC, separador `/`, sem `..`, segmentos vazios, caminhos absolutos, drives, controlos ou nomes incompatíveis com exportação. Mostrar o nome original; não alterar silenciosamente caminhos potencialmente perigosos. Case-only rename é permitido sem duplicar identidade.
- **FILE-10** Reabrir ficheiro fechado, Restaurar da reciclagem e Desfazer a última operação estrutural. O undo estrutural é independente do undo de escrita e do backstep do MIPS. Definir disponibilidade por histórico confirmado; não prometer desfazer uma operação remota já publicada.

### P0 — persistência e Cloud privada

- **CLOUD-01** Navegar em metadados paginados no servidor. Selecionar não descarrega documentos completos. Só obter o conteúdo ao consultar ficheiros, abrir ou sincronizar o projeto.
- **CLOUD-02** Primeira ligação explícita: «Guardar na Cloud» cria uma cópia privada e grava o vínculo; «Ligar a uma cópia existente» exige seleção e comparação. Nada é ligado só por ter o mesmo nome.
- **CLOUD-03** Abrir um projeto remoto cria/reutiliza a cópia local ligada por ID. Se houver alterações locais divergentes, abrir resolução de conflito antes de substituir dados.
- **CLOUD-04** Guardar localmente não envia automaticamente à Cloud nesta entrega. «Guardar na Cloud», «Sincronizar» e «Sincronizar projetos ligados» são explícitos. A última ação não publica projetos nem envia projetos nunca ligados. Autenticar pode atualizar metadados, sem substituir conteúdo.
- **CLOUD-05** Estados independentes de gravação local e Cloud: Só neste dispositivo, Sincronizado, Alterações locais, Alterações na Cloud, Em sincronização, Conflito, Sem ligação, Sessão expirada. «Guardado» não implica «Sincronizado».
- **CLOUD-06** Usar cópia base e ETag exato para detetar divergência. Não escolher vencedor pelo relógio. Resolver por comparação de ficheiros e operações estruturais, com Manter local, Usar Cloud ou Guardar cópia separada; confirmar a substituição e preservar a alternativa recuperável. Não implementar merge textual automático nesta entrega.
- **CLOUD-07** Uma sincronização explícita sem rede pode ficar pendente após confirmação local, com estado visível e cancelável. Repetir automaticamente apenas essa intenção, com backoff e a mesma conta/instalação; não executar eliminações destrutivas ou publicações adiadas silenciosamente.
- **CLOUD-08** «Remover deste dispositivo», «Mover cópia Cloud para a reciclagem» e «Remover ambas» são ações distintas. O diálogo enumera as consequências. Uma falha remota nunca é apresentada como remoção remota concluída.

### P0 — biblioteca pública e publicações próprias

- **PUB-01** Pesquisa pública sem conta, com filtros de título/nome público, autor, tags, tipo, idioma e dificuldade; ordenação por atualização, título e autor. O filtro de autor tem de funcionar no servidor, não apenas no texto de ajuda.
- **PUB-02** Consultar metadados, instruções, licença, revisão, árvore de ficheiros e fonte só de leitura antes de importar. A consulta nunca executa código, muda preferências, layout ou projeto ativo.
- **PUB-03** «Criar cópia e abrir» cria novo UUID local e nova identidade para os ficheiros, preservando origem e revisão. Duas importações não sobrescrevem trabalho existente. Importar não liga a cópia privada do autor à conta do leitor.
- **PUB-04** Publicar exige projeto de origem explícito, revisão do conjunto de ficheiros e formulário com título, slug, descrição, instruções, tags, tipo, idioma, dificuldade, licença e visibilidade. Não usar silenciosamente o «projeto que está ativo agora» para atualizar uma publicação previamente selecionada.
- **PUB-05** Na primeira publicação, explicar de forma breve que o slug fica reservado e que as revisões são imutáveis. «Público» aparece na pesquisa; «Não listado» é acessível por ligação; não apresentar «Privado» como estado de publicação.
- **PUB-06** Guardar a associação entre projeto de trabalho e publicação. Para uma nova revisão mostrar projeto, publicação, revisão base e resumo de ficheiros alterados. Permitir escolher outra origem explicitamente, com confirmação. Repetir após timeout não acrescenta outra revisão.
- **PUB-07** «As minhas publicações» permite editar metadados atuais, criar revisão, listar revisões, consultar/copiar ligação fixa de cada revisão, copiar ligação atual, arquivar e restaurar. As revisões anteriores mantêm conteúdo e metadados originais.
- **PUB-08** Preservar `/p/slug`, `/p/slug@N` e `/e/id`. Arquivar esconde a listagem e a ligação atual; as ligações fixas existentes continuam a funcionar. Não reciclar slugs. Eliminar projeto privado não arquiva nem elimina publicação.
- **PUB-09** Não incluir sessão, conta, vínculos Cloud, tokens, estados de execução, caminhos absolutos, bibliotecas externas ou preferências privadas no payload público. Respeitar os limites e a verificação de email do servidor.

### P0 — estados, pesquisa e integração

- **UI-01** Implementar o desenho de DESIGN.md no sistema de janelas existente, com temas, idioma, minimizar/maximizar, persistência de posição e modo compacto.
- **UI-02** Uma única família de componentes para listas e árvores. Os menus Ficheiro/Cloud/Biblioteca tornam-se atalhos para vistas e comandos deste sistema. Nenhum menu conserva uma implementação alternativa das mesmas mutações.
- **UI-03** Distinguir carregamento inicial, atualização com dados existentes, sucesso vazio, zero resultados filtrados, erro, offline com cache, sessão expirada e falta de permissão. Só uma resposta de sucesso válida com zero itens permite dizer «Ainda não há projetos».
- **UI-04** Pesquisa local imediata por nome/caminho; pesquisa remota com debounce de 300 ms, cancelamento e proteção contra respostas fora de ordem. Filtrar, ordenar ou mudar de conta reinicia a paginação e reconcilia a seleção.
- **UI-05** Paginação remota de 25 itens, opções 25/50/100 com teto no servidor; resumo «1–25 de N» quando houver total exato. Sem total, mostrar só intervalo e anterior/seguinte. Nunca inventar totais ou páginas.
- **UI-06** A app tem de funcionar em Firefox e Chromium, nos dois temas, com zoom 80/100/125/150/200%, teclado e toque. Nenhum rodapé, ação ou campo pode ficar inacessível por overflow.
- **UI-07** Textos curtos e dirigidos ao utilizador. Erros traduzidos por código e com ação de recuperação. Detalhes técnicos ficam num detalhe expansível, nunca misturados com o estado vazio.

## 4. Reciclagem

Recursos locais e cópias Cloud privadas suportam restauro. A vista identifica a origem e o âmbito; não combina itens de contas diferentes. Restaurar conserva IDs quando possível e resolve colisões antes de escrever. Não há purga automática nesta entrega. Limites de espaço incluem a reciclagem; oferecer exportação e esvaziamento explícito. Eliminar definitivamente exige confirmação com contagem e âmbito. Publicações arquivadas pertencem à vista Publicações, não à reciclagem privada.

## 5. Fora desta entrega

Colaboração simultânea, partilhas privadas com ACL, equipas, Git integrado, editor remoto sem cópia local, edição de binários, terminal de sistema, drives virtuais do sistema operativo, histórico ilimitado de versões privadas, merge textual automático e um novo framework de UI. Não redesenhar o compilador, o simulador ou a autenticação; adaptar apenas as suas fronteiras com o novo modelo.

## 6. O que significa estar concluído

Todos os requisitos obrigatórios e todos os cenários de ACCEPTANCE.md aprovados; frontend e BackMars compatíveis; migração ensaiada; testes sem regressões; interface verificada com servidor real e também sem ele; documentação e 20 idiomas atualizados. Uma maquete bonita, uma lista sem erros visíveis ou apenas a correção do CSS não satisfazem esta especificação.
