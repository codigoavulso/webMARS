# Plano técnico e sequência de implementação

## Estado da implementação (22-10-2026)

Já está integrado no frontend e no BackMars um primeiro corte utilizável do gestor unificado:

- `assets/js/app-modules/21-project-manager.js` abre uma janela nativa única para dispositivo, Cloud, biblioteca pública, publicações próprias e reciclagem.
- A janela já tem pesquisa, seleção sem ativação implícita, inspeção, abertura/cópia, eliminação/restauro, importação/exportação JSON e paginação remota.
- `GET /api/v2/projects` fornece pesquisa e páginas de metadados privados; o documento completo só é pedido quando necessário.
- O contrato privado v2 já inclui criação idempotente por `clientProjectId`, leitura/escrita com `If-Match` e operações explícitas de reciclagem/restauro, mantendo as rotas v1 para clientes antigos.
- `GET /api/capabilities` permite à app confirmar as capacidades do BackMars antes de activar fluxos dependentes da versão.
- A biblioteca pública aceita filtros de autor, tipo, idioma, dificuldade e ordenação no servidor; `GET /api/publications/:slug/revisions` lista revisões sem transportar fontes.
- O fluxo de publicações resolve o detalhe/revisão antes de criar uma cópia local, evitando o falso vazio devolvido pelas listagens resumidas.
- A eliminação local atualiza a biblioteca persistente e sincroniza o estado ativo do runtime; a reciclagem não apaga automaticamente a cópia Cloud nem a publicação.
- `20-project-repository.js` abre um repositório IndexedDB, migra o catálogo/recycling legacy de forma idempotente e mantém uma cópia de compatibilidade em localStorage durante a transição. Os projetos novos recebem uma identidade persistente no catálogo.

Este corte mantém o armazenamento local v1/localStorage e os comandos legados como compatibilidade. A transição ainda não é a separação completa do domínio: faltam a normalização transacional de entradas/pastas, a outbox de sincronização, a reciclagem Cloud e a migração da sessão do editor para stores independentes. Esses pontos continuam na segunda fase abaixo e não devem ser apresentados como concluídos.

## 1. Diagnóstico do código atual

São observações do código local em 22-10-2026, não uma lista exaustiva de incidentes de produção.

| Evidência | Consequência / decisão |
|---|---|
| `styles.css`: `.collection-browser` define seis linhas, enquanto caption e details podem desaparecer do fluxo com `[hidden]` | A lista/rodapé podem ocupar linhas erradas. Usar áreas explícitas e estados de layout verificáveis. |
| `11-ui-file-manager.js`, `createCollectionWindow.load`: no catch, chama `render()` com lista vazia antes de escrever o erro no rodapé | Produz o falso vazio da captura. Estado tipado distinto de `success-empty`. |
| `20-app-runtime.js`, `chooseCloudProjectId`: filtra e pagina uma lista já descarregada | Implementar paginação real de metadados privados no servidor. |
| `chooseLatestRemoteProjectByName`, `renameCloudProjectByName`, `deleteCloudProjectsByName` | Nome participa em identidade e mutações remotas. Substituir por vínculos explícitos de IDs. |
| `collectProjectFilesFromEditor` deriva ficheiros do projeto de `editor.getFiles()`; `closeActive/closeAll` removem dessa lista e podem criar `untitled.s` | Acoplamento perigoso entre separadores e pertença ao projeto. Separar repositório e editor antes de redesenhar a UI. Testar a perda de ficheiros diretamente. |
| `createProjectFileManagerView.onSelect` ativa o projeto selecionado | Seleção tem efeito sobre o trabalho. Reservar ativação para comando explícito. |
| `performOwnPublicationAction('revision')` serializa o projeto global ativo | Pode publicar trabalho errado na publicação selecionada. Exigir origem explícita e vínculo persistente. |
| O formulário de publicação envia `instructions: ""` e usa o idioma corrente da app | Metadados do conteúdo ficam incompletos/implícitos. Expor campos próprios. |
| Backend `models.list_publications` pesquisa slug/título/descrição/tags, mas não o autor | O novo filtro de autor tem de ser implementado na query do servidor. |
| `/api/projects` já possui ETags, `If-Match`, respostas 412/428 e `serverTime`; documentos completos são opcionais | Preservar concorrência e leitura económica; não recomeçar estes mecanismos do zero. |
| Publicações já possuem sanitização, slugs permanentes, snapshot de metadados e revisões imutáveis | Reutilizar e testar. Não converter publicação em documento privado mutável. |
| `webmars-config.js` aponta instalações locais para a mesma máquina, porta 5000 | Um frontend em 8081 não inicia o backend. Falha de ligação deve ser apresentada honestamente. Não usar produção como fallback local automático. |

## 2. Arquitetura proposta

Manter JavaScript sem framework novo, o carregador de módulos atual e Flask/SQLite. Evitar acrescentar milhares de linhas ao `20-app-runtime.js`. Extrair primeiro lógica pura e introduzir adaptadores antes de remover caminhos antigos.

```text
Painel Projeto / Gestor / Menus / Editor
                 ↓ comandos por identidade
ProjectCommands + PublicationCommands
                 ↓
ProjectRepository ── SessionStore
     │                    (separadores e posições)
     ├─ LocalRepository (IndexedDB)
     ├─ SyncCoordinator → CloudGateway → BackMars
     └─ PublicationGateway → BackMars

ListController → {LocalProvider, CloudProvider, PublicProvider, OwnProvider, TrashProvider}
               → Table / Tree / Inspector / StateView
```

O controller não conhece SQL ou localStorage; o renderer não conhece fetch; gateways não alteram o editor. Os comandos retornam resultados tipados e eventos de domínio. A UI atualiza a partir do estado confirmado. Uma notificação de erro não substitui o resultado da operação.

### Fronteiras sugeridas

| Módulo | Responsabilidade |
|---|---|
| `project-domain` | IDs, caminhos, validação, plano de mutações, permissões, serialização. Sem DOM/rede. |
| `project-repository` | Transações locais, consultas, migração, reciclagem, revisão local e undo estrutural. |
| `workspace-session` | Separadores e buffers por ID, projeto ativo, cursor; fecho independente dos ficheiros. |
| `cloud-projects` | Gateway e vínculos por conta/instalação; ETags e fila de intenções de sincronização. |
| `publications` | Pesquisa, consulta/revisões, sanitização e publicação idempotente. |
| `project-manager-ui` | Janela principal, navegação e estado; reutiliza tabela/árvore/inspeção. |
| `20-app-runtime` | Ligação dos comandos à app, ao compilador e ao simulador. Sem cópias concorrentes do domínio. |

Escolher nomes/ficheiros compatíveis com a ordem do bootstrap. Verificar inclusão nos manifests, build, pacote e carregamento em produção. Não introduzir imports ES onde o carregador atual espera scripts clássicos sem uma adaptação explícita.

## 3. Modelo local v2

IDs novos: UUID aleatório persistido, gerado uma só vez; nunca calculado pelo nome. Manter IDs de ficheiros legados válidos e únicos, ou criar mapeamento estável quando for necessária conversão.

```ts
type Project = {
  schemaVersion: 2;
  id: string;
  name: string;
  description: string;
  localRevision: number;
  createdAt: string;
  updatedAt: string;
  settings: object;              // apenas configuração do projeto
  layout: object | null;         // layout explícito do projeto, se existente
  savedStates: object[];         // preservar slots existentes, sem os publicar
  origin: {kind: 'example'|'publication', instance: string,
           id: string, revision?: number} | null;
};
type Entry = {
  projectId: string;
  id: string;
  kind: 'file'|'folder';
  path: string;                  // relativo, preserva maiúsculas de apresentação
  pathKey: string;               // normalização comum para colisões
  source?: string;               // só nos ficheiros, sem duplicado savedSource
  updatedAt: string;
};
type Session = {
  activeProjectId: string | null;
  openFileIds: string[];
  activeFileId: string | null;
  positions: Record<string, object>;
};
type CloudBinding = {
  localProjectId: string;
  instance: string; ownerId: number; remoteId: number;
  etag: string; baseSnapshot: object;
  lastSyncedLocalRevision: number;
};
```

A representação física pode separar blobs de fonte para eficiência, mas deve oferecer a mesma atomicidade. `source` pertence ao ficheiro; um buffer de edição ainda não persistido pode ter versão própria. `savedSource` duplicado não deve ser a única forma de saber se está guardado. Datas servem para apresentação; `localRevision`/ETag/base servem para concorrência.

IndexedDB é o armazenamento canónico v2, com stores para projetos, entradas, sessões, vínculos, reciclagem, undo estrutural, cache de metadados e outbox. Índice único `(projectId,pathKey)` e IDs únicos; validação explícita de colisão ficheiro/pasta no mesmo caminho e relações ancestrais. Não manter duas fontes de verdade em IndexedDB e localStorage.

Se IndexedDB estiver indisponível, não cair silenciosamente para uma gravação menos segura: preservar buffers em memória, indicar que não estão guardados e permitir exportar/recuperar os dados antigos. Escritas concorrentes entre separadores do navegador usam revisão esperada e transação; BroadcastChannel serve para notificar, não para garantir exclusão mútua.

Os caminhos são normalizados da mesma forma em JS e Python. Manter fixtures comuns de Unicode, maiúsculas, colisões, nomes reservados e caminhos maliciosos. Aplicar rejeição antes da escrita, não corrigir colisões por perda de entradas.

## 4. Estado, transações e comandos

Contratos mínimos de comando: `createProject`, `createEntry`, `renameEntry`, `moveEntries`, `copyEntries`, `trashEntries`, `restoreEntries`, `deletePermanently`, `importProject`, `exportProject`, `openProject`, `closeProject`, `openFile`, `closeTab`, `saveLocal`, `linkCloud`, `syncProject`, `resolveConflict`, `publish`, `publishRevision`, `archivePublication`, `restorePublication`.

Cada comando recebe IDs, versão esperada e argumentos explícitos. Retorno comum:

```ts
type Result<T> =
 | {ok:true; value:T; operationId:string; changedIds:string[]}
 | {ok:false; code:string; field?:string; retryable:boolean; details?:object};
```

Planear a operação → validar tudo → confirmar consequências quando necessário → transação → atualizar sessão/seleção por ID → notificar. Revalidar na transação para não confiar numa prévia antiga. Não remover a origem de um move entre projetos antes de o destino estar confirmado. Eliminações e substituições guardam dados suficientes para restauro/undo, incluindo pastas vazias e caminhos.

### Listas

Estado discriminado: `idle | loading | ready | empty | error | stale | auth-required`. Separar `items`, `selection`, `query`, `filters`, `sort`, `page`, `requestGeneration`, `operation`. `error` não é `items=[]` com mensagem no rodapé. Uma atualização mantém os últimos dados e assinala-os como obsoletos; a resposta atual substitui-os atomicamente. Mudar conta/instalação cancela pedidos, invalida seleção/cache privada e incrementa a geração.

Providers recebem `{query,filters,sort,limit,offset,signal}` e devolvem `{items,page:{limit,offset,hasMore,total?}}`. Rejeitar payload malformado; não convertê-lo em lista vazia de sucesso. Ordenação determinística com desempate por ID. A paginação não promete um snapshot imutável de um catálogo que está a mudar; Atualizar reinicia/reconcilia a navegação. Em dados estáveis, não pode haver duplicação ou omissão entre páginas.

## 5. Contratos BackMars

### 5.1 Evolução compatível

Acrescentar `/api/capabilities` para informar contratos disponíveis e limites. Introduzir `/api/v2/projects` para a gestão privada evoluída, preservando as rotas v1 para clientes existentes. A app nova só ativa escrita v2 após a capacidade ter sido confirmada. Se o backend estiver desatualizado, manter trabalho local e explicar a indisponibilidade da gestão Cloud; não simular compatibilidade nem voltar a correspondência por nome.

As extensões de publicações podem evoluir as rotas atuais de modo aditivo. Manter os formatos de leitura pública v1 e links existentes. Uma revisão de UI não justifica quebrar slugs, formatos de exercícios ou contas.

### 5.2 Projetos privados v2

| Método e rota | Contrato |
|---|---|
| `GET /api/v2/projects` | `q`, `sort`, `order`, `limit`, `offset`, `scope=active|trash`; só metadados, ETag e paginação. |
| `POST /api/v2/projects` | `{clientProjectId,name,document}`; criação idempotente por conta + UUID; rejeitar mesma chave com outro conteúdo. |
| `GET /api/v2/projects/:id` | Documento, metadados e ETag; propriedade sempre verificada. |
| `PUT /api/v2/projects/:id` | Nome/documento explícitos e `If-Match` exato; escrita atómica. |
| `POST /api/v2/projects/:id/trash` | `If-Match`; soft delete, sem eliminar publicações. |
| `POST /api/v2/projects/:id/restore` | `If-Match`; resolver colisão de nome antes da confirmação. |
| `DELETE /api/v2/projects/:id` | Eliminação definitiva de item já na reciclagem, `If-Match`. |

Resposta de listagem: `{projects:[{id,clientProjectId,name,updatedAt,createdAt,sizeBytes,fileCount,etag,deletedAt}],page:{limit,offset,hasMore,total?},serverTime}`. Não transportar fontes nas listas. Documento privado v2: objeto com discriminador e versão explícitos, validado; usar adaptador para os documentos atuais `kind/version/project` e os documentos legados aceites pelo backend.

Migração SQLite aditiva: UUID de cliente persistente nos registos existentes, `deleted_at`, índices necessários e histórico de idempotência. Manter IDs numéricos, proprietários, datas e conteúdo. Não recriar contas nem reescrever em massa o JSON privado para lhe impor o formato novo. No primeiro acesso, converter pelo adaptador e gravar apenas numa escrita explícita validada. As queries v1 não devem listar itens v2 na reciclagem como projetos ativos.

### 5.3 Publicações

- Listas pública e própria recebem filtros/ordenação/paginação no servidor, com allowlist de campos SQL. Pesquisa por autor usa o autor público, sem expor email/identidades OAuth.
- Acrescentar `GET /api/publications/:slug/revisions` paginado, apenas metadados das revisões visíveis; fontes só na consulta de revisão específica. Arquivo mantém a regra de ligações fixas existente.
- Metadados próprios e criação de revisão devolvem/aceitam ETag de publicação, atualizado quando metadados, estado ou última revisão mudam. Comparação dentro da mesma transação da alteração. Manter compatibilidade dos leitores antigos.
- `Idempotency-Key` nas criações/publicações/revisões: associar a conta, rota e hash do pedido; repetição idêntica devolve a operação original. Repetição com corpo diferente falha. Persistir o resultado na transação; definir retenção e limites, sem armazenar segredos nesse registo.
- A ligação local projeto-publicação não é metadado público obrigatório. A app mantém o vínculo no seu domínio privado. Reimportar uma publicação nunca atribui ownership da publicação ao importador.
- Continuar sanitização de conteúdo público e snapshot de metadados nas revisões. O contrato público `webmars-public-project` v1 permanece como formato de partilha; não enviar o manifesto privado v2 diretamente.

### 5.4 Erros e concorrência

Usar códigos estáveis: `auth_required`, `forbidden`, `not_found`, `name_conflict`, `path_conflict`, `stale_version`, `precondition_required`, `invalid_document`, `unsupported_version`, `quota_exceeded`, `rate_limited`, `idempotency_conflict`. Preservar códigos existentes quando equivalentes. Frontend traduz o código e o campo; mensagem inglesa do servidor é diagnóstico de fallback.

401 pede autenticação e suspende intenções; 403 não repete; 409 resolve colisão; 412 resolve divergência; 428 é erro de contrato; 413 mostra limite; 429 respeita `Retry-After`; 5xx/rede permitem repetição controlada. As rotas v2 rejeitam `If-Match:*` para substituições que exijam versão concreta. Preservar cookies, proteção de sessão e política CORS existente; acrescentar só os headers necessários às novas rotas.

## 6. Algoritmo de sincronização

Comparar local atual, base do último sync e remoto atual, por conteúdo/caminhos/IDs, não pelas datas:

| Local vs. base | Remoto vs. base | Resultado |
|---|---|---|
| igual | igual | Sincronizado; sem escrita |
| alterado | igual | Upload com ETag da base |
| igual | alterado | Guardar remoto localmente numa transação; manter alternativa recuperável |
| alterado | alterado, conteúdo final igual ao local | Atualizar vínculo/base sem duplicar |
| alterado | alterado, diferente | Conflito; não escrever nenhum lado |

Serializar operações por vínculo. Capturar a `localRevision` enviada: se o utilizador continuar a escrever durante o upload, o sucesso confirma apenas aquela revisão; as novas alterações continuam pendentes. Se vier 412 entre leitura e escrita, voltar a conflito, sem `force` automático. Não marcar tudo sincronizado com base numa única resposta tardia.

Repetição de intenções explícitas: backoff com jitter e teto de 60 s; respeitar 429; suspender quando muda a conta/instalação; cancelar visivelmente. Uma primeira criação usa a mesma chave até se saber o resultado. Publicações não entram numa fila silenciosa que as possa tornar públicas horas depois.

## 7. Migração local e compatibilidade

1. Inventariar chaves reais: `mars45-web-project-v1`, `mars45-web-project-library-v1`, `mars45-web-session-v3`, sessão v1 e armazenamento avulso existente. Ler sem apagar.
2. Congelar cópia de recuperação identificada por versão/hash. Detetar dados malformados, quota e colisões antes de confirmar. A prévia/inventário não deve criar projetos duplicados.
3. Importar catálogo e ficheiros completos em transação IndexedDB; sessão antiga passa apenas a indicar separadores. Não deduzir exclusão de ficheiros a partir de separadores fechados.
4. Atribuir IDs determinísticos durante a mesma migração e persistir o mapeamento; reexecutar não cria outras identidades.
5. Converter estados guardados e ficheiros avulsos recuperáveis. Se não houver associação inequívoca, criar um projeto «Recuperados» em vez de perder conteúdo ou adivinhar ownership.
6. Não ligar projetos locais/remotos legados por nome. Preservar vínculos inequívocos existentes; os restantes ficam Só neste dispositivo até ligação explícita/comparação.
7. Verificar contagens, hashes das fontes, pastas vazias, configurações e slots; só então marcar v2 ativa. Manter dados antigos como recuperação, sem dual write.
8. Se uma aba antiga escrever nas chaves legadas depois da migração, detetar e pedir recuperação/recarregamento; não misturar silenciosamente versões. Testar duas abas v2 em paralelo.
9. Documentar recuperação/exportação e rollback. Reverter frontend não converte dados v2 automaticamente nem elimina as cópias v2. Um rollback tem de preservar uma exportação dos dados escritos desde a migração.

Nunca testar migração sobre dados reais sem backup nem introduzir limpeza automática para fazer os testes passarem. Limites de armazenamento consideram dados ativos, reciclagem e snapshots de sincronização.

## 8. Ordem de execução e gates

| Etapa | Entrega verificável antes de avançar |
|---|---|
| E0 — reproduzir e proteger | Fixtures legadas e testes que demonstram falso vazio, layout, fechar-separador e colisões por nome. Baseline dos dois repositórios. |
| E1 — domínio e migração | Repositório transacional, IDs, separação sessão/conteúdo, caminhos e recuperação. Fechar/reabrir preserva o inventário. |
| E2 — comandos locais | CRUD, lote, importação/exportação, reciclagem e undo; painel Projeto usa os novos comandos. |
| E3 — superfície comum | Gestor único, listas/árvore/inspeção e estados; verificar todos os tamanhos e zoom. |
| E4 — backend e Cloud | Capabilities, rotas v2, paginação, vínculos, concorrência, idempotência e conflito. Fixtures com backend real. |
| E5 — publicações | Consulta/revisões, formulários completos, origem explícita, ligações permanentes e arquivo/restauro. |
| E6 — integração e entrega | Remover fluxos antigos, traduzir, atualizar manual, validar matriz completa e documentar alterações. |

Não parar em E3 dizendo que a UI está pronta se os comandos ainda usam o modelo anterior. Uma etapa pode ser dividida em alterações menores, mas cada alteração tem de manter a app utilizável. Não executar refactor de simulador/compilador para resolver uma fronteira de ficheiros.

## 9. Desempenho, tradução e observabilidade

- Listas remotas limitadas a 100 itens e sem documentos; fontes obtidas só a pedido. Testar com 1 000 projetos/10 000 metadados de ficheiros locais e 500 publicações sintéticas; não é permissão para exceder os limites de publicação existentes.
- Filtragem/seleção local devem responder em menos de 100 ms no ambiente de teste documentado; evitar reconstruir todo o DOM por movimento de seleção. Virtualizar apenas quando necessário e sem perder acessibilidade.
- Paginação, abortos e deduplicação reduzem pedidos; não fazer polling contínuo para uma janela escondida.
- Novas chaves em en/pt/es revistas; usar `scripts/translate-new-keys.mjs` para as restantes línguas, sem regenerar catálogos completos. Verificar placeholders e `npm run check:i18n`.
- Métricas apenas de ações agregadas existentes/allowlisted. Não incluir nomes de projetos, caminhos, fontes, pesquisas, IDs de conta ou tokens. Não alargar a recolha para depurar esta tarefa.
- Testes podem registar duração e número de pedidos com dados sintéticos. Logs de produção não recebem conteúdo de ficheiros ou credenciais.
