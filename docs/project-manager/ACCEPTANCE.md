# Critérios de aceitação e plano de testes

Cada cenário deve indicar o requisito coberto, fixture, resultado e prova. Não basta verificar que existe uma função ou que um texto aparece no código: testar resultados de comandos, armazenamento real, contratos HTTP e interação no navegador.

## 1. Matriz obrigatória

| ID | Cenário | Resultado exigido |
|---|---|---|
| A01 | Projeto com 20 ficheiros; abrir 2, fechar 1, fechar todos e recarregar | Os 20 permanecem, com fontes e caminhos iguais. Zero ficheiros artificiais. |
| A02 | Selecionar projeto B enquanto A tem alterações | A continua ativo e editável; só a ação Abrir muda o contexto. |
| A03 | Renomear projeto e pasta com ficheiros abertos e ligação Cloud | IDs e vínculo iguais; caminhos/labels/seleção atualizados; sem duplicação remota. |
| A04 | Guardar com falha de quota/IndexedDB | Buffer e alterações preservados; não diz Guardado; exportação disponível. |
| A05 | Criar projeto/pasta vazios, fechar e recarregar | Continuam vazios; montagem indisponível de forma coerente. |
| A06 | Ctrl+S; Descarregar; Guardar na Cloud; Publicar | Quatro efeitos distintos e previsíveis; Ctrl+S não gera download nem rede. |
| A07 | Duplicar projeto e importar a mesma publicação duas vezes | UUIDs novos; originais intactos; nenhuma ligação Cloud herdada indevidamente. |
| A08 | Copiar/mover lote com colisão e Cancelar | Nenhuma alteração parcial. Manter ambos preserva fontes; substituir é recuperável. |
| A09 | Mover pasta para descendente; caminhos absolutos/`..`/NUL/Unicode colidente | Rejeição antes da escrita, sem perder outros itens do lote. |
| A10 | Fechar projeto com persistência a falhar | Troca cancelada; conteúdo continua acessível e exportável. |
| A11 | Reciclar/restaurar projeto, ficheiro e pasta vazia | Conteúdo, estrutura e identidades preservados; colisões tratadas. |
| A12 | Remover apenas local; apenas Cloud; ambas com falha remota | Âmbitos respeitados e estado de falha verdadeiro; publicações intactas. |
| A13 | Desfazer operação estrutural; Ctrl+Z no editor; backstep MIPS | Históricos independentes, sem ações num contexto errado. |
| A14 | Descarregar «como» outro nome | O original não é renomeado por efeito do download. |
| A15 | Biblioteca global / resultado Mini-C | Só de leitura onde aplicável; cópia explícita cria fonte do projeto; publicação não inclui buffers alheios. |
| A16 | Backend desligado, sem cache | Erro recuperável, sem «não há projetos», sem falso total/página e sem rodapé a meio da janela. |
| A17 | Backend responde 200 com array vazio | Vazio real, com ação apropriada; não mostra erro. |
| A18 | Filtro sem resultados vs. catálogo vazio | Mensagens distintas; Limpar filtros só no caso filtrado. |
| A19 | JSON 200 inválido, 401, 403, 404, 413, 429, 500 | Estado e recuperação próprios; nenhum é tratado como catálogo vazio. |
| A20 | Pedido lento A, pesquisa B termina antes; fechar/reabrir durante pedido | Só B atualiza a lista; resposta antiga não reabre janela nem altera seleção. |
| A21 | Metadados existentes, Atualizar falha | Dados preservados e marcados obsoletos; ações remotas arriscadas não usam seleção antiga. |
| A22 | 126 projetos privados e 126 publicações | Paginação real; páginas sem duplicação em fixture estável; respostas só com metadados. |
| A23 | Pesquisa pública por autor, tags, idioma, tipo e dificuldade | Filtros combinados no servidor; sem emails ou identidades privadas na resposta. |
| A24 | Login com projeto local homónimo de remoto distinto | Não ligar nem substituir automaticamente. |
| A25 | Cada linha da tabela de sincronização de IMPLEMENTATION.md | Decisão correta por base/ETag/conteúdo, mesmo com relógio local adiantado dois dias. |
| A26 | Dois clientes escrevem; remoto muda entre GET e PUT | 412, conflito visível, nenhuma escrita forçada ou perda de alternativa. |
| A27 | Editar enquanto upload está em curso | Só a revisão enviada fica confirmada; alterações posteriores continuam pendentes. |
| A28 | Timeout depois de criação/revisão aceite; repetir | Um projeto/uma revisão; mesma resposta lógica; chave reutilizada com outro corpo falha. |
| A29 | Logout ou troca de conta durante pedido/fila | Não aplicar resposta antiga; não enviar fila da conta anterior; limpar dados privados da vista. |
| A30 | Sessão expira, autenticar outra vez | Intenção preservada mas revalidada; sem repetição automática de publicar/eliminar. |
| A31 | Consultar publicação e escolher revisão antiga | Nenhuma mudança no projeto/layout/editor; metadados e fonte correspondem à revisão escolhida. |
| A32 | Criar cópia pública com projeto local alterado aberto | Projeto anterior confirmado primeiro; cópia independente; origem/revisão registadas. |
| A33 | Publicar com projeto A; selecionar publicação de A; ativar B | Nova revisão mostra origem explícita; nunca publica B silenciosamente. |
| A34 | Editar metadados/publicar enquanto outro cliente muda publicação | Concorrência detetada; revisões anteriores byte a byte iguais. |
| A35 | Público → Não listado → Arquivado → Restaurado | Listagem e links atuais corretos; links fixos mantêm-se e slug nunca é libertado. |
| A36 | Inspecionar payload público com tokens/layout/conta no estado privado | Campos privados ausentes no cliente e removidos/rejeitados no servidor. |
| A37 | Cancelar importação/publicação; falha de validação ou rede | Sem escrita parcial; formulário e seleções úteis preservados para corrigir/repetir. |
| A38 | Abrir a mesma vista por todos os menus legados | Mesma janela/controlador/comandos; sem seletores alternativos ou instâncias duplicadas. |
| A39 | Só teclado e leitor de ecrã | Navegação completa, foco restaurado, seleção e estados anunciados; nomes de ações claros. |
| A40 | Tema claro/escuro; zoom 80/100/125/150/200%; janelas 360×640, 768×700 e 1280×800 | Rodapé sempre acessível, regiões não trocam de lugar, tabelas utilizáveis e ações disponíveis. |
| A41 | Caption/detalhes/ações presentes e ausentes em todas as combinações | Lista mantém a região flexível; nenhum bloco vazio recebe acidentalmente a altura da janela. |
| A42 | Abrir recurso público/privado de outra conta por ID manipulado | Servidor aplica ownership; detalhe privado não vaza por erro, cache ou listagem. |
| A43 | Recuperar sessão/layout da app | Só restaura navegação/janelas; não repete mutações. |
| A44 | Backend anterior sem capacidades v2 | App local continua; Cloud explica atualização necessária, sem fallback inseguro por nome. |
| A45 | Exportar e reimportar projeto completo | Fontes, Unicode, pastas vazias, configurações e estados definidos no formato mantêm-se. Vínculos de conta não viajam como autorização. |

## 2. Fixtures de migração

Obrigatórias: instalação vazia; projeto v1 isolado; biblioteca com vários projetos; sessão v1/v3; avulsos; pastas vazias; estados guardados; IDs duplicados; nomes homónimos; diferença apenas de maiúsculas; payload corrompido; quota insuficiente; interrupção antes/depois do commit; duas abas; registos Cloud legados; frontend novo/backend antigo; importação pública v1.

Para cada fixture: comparar inventário e hashes das fontes antes/depois; reexecutar migração duas vezes; confirmar ausência de duplicados; ensaiar recuperação. Não afirmar que um ficheiro já perdido pelo sistema antigo foi recuperado se não existir noutra cópia/backup.

## 3. Níveis de validação

1. **Domínio**: planos de operações e invariantes com árvores reais, colisões e falhas injetadas.
2. **Persistência**: transações IndexedDB no navegador; testar rollback e concorrência entre abas. Um fake de IndexedDB não basta como prova final.
3. **HTTP**: testes Flask com SQLite temporária, autorização, paginação, ETags, idempotência, reciclagem e imutabilidade pública.
4. **Integração**: frontend e BackMars de teste, com rede lenta/desligada e fixtures. Confirmar que localhost funciona sem depender do serviço de produção.
5. **UI**: navegação, teclado, toque, temas e zoom; screenshots de lista preenchida, erro, vazio, inspeção pública, conflito e reciclagem.
6. **Regressão**: compilar/montar/executar projetos multificheiro, includes, Mini-C, exemplos estáveis, autenticação, métricas e manual continuam operacionais.

## 4. Comandos existentes a preservar

Frontend: `npm run build`, `npm run check:i18n`, `npm test`, `npm run validate`; testes focados `tests/cloud-sync-contract-regression.test.mjs`, `tests/public-links.test.mjs`, `tests/social-login.test.mjs`, `tests/window-focus-regression.test.mjs`, `tests/release-readiness.test.mjs` e testes novos de domínio/integração. Atualizar os contratos que deixem de ser válidos, sem remover garantias como `If-Match` para obter testes verdes.

BackMars: correr a descoberta `python -m unittest discover -s tests` no repositório irmão com o seu ambiente configurado e BD temporária. Não apontar testes a ficheiros/BD de produção. Manual: build e testes próprios em `manual/`, além dos testes de exemplos do frontend.

## 5. Gate final

- [ ] Todos os requisitos obrigatórios de REQS.md têm cenário e resultado registados.
- [ ] Nenhuma perda de conteúdo em fechar/abrir/renomear/mover/sincronizar/migrar.
- [ ] Não restam mutações por correspondência de nome ou listas de separadores.
- [ ] Não restam implementações legadas concorrentes acessíveis pelos menus.
- [ ] Backend novo mantém leitura/links/clientes legados previstos; capacidades verificadas.
- [ ] Pesquisa/paginação privada e pública usam metadados no servidor.
- [ ] Interface validada com sucesso, vazio e falha, incluindo a situação da captura.
- [ ] Compatibilidade Firefox/Chromium, zoom, teclado e dois temas verificada.
- [ ] Todos os idiomas, documentação de uso e formatos atualizados.
- [ ] Riscos, resultados dos testes e recuperação de migração documentados.
- [ ] Nenhum Git, release ou deploy executado sem pedido posterior.
