# Instruções para a IA de implementação

O texto seguinte é o pedido de execução preparado para a próxima IA. Os documentos ligados são a especificação, não evidência de funcionalidades já implementadas.

---

Implementa a reformulação integral da gestão de projetos e ficheiros do webMARS, com base em `docs/project-manager/README.md`, `REQS.md`, `DESIGN.md`, `IMPLEMENTATION.md` e `ACCEPTANCE.md`. Lê os cinco antes de alterar código. O objetivo é mudar o modelo do produto e os fluxos, não apenas corrigir o CSS ou acrescentar botões ao desenho antigo.

Workspace principal: `C:/Users/user/Documents/webMARS`. Backend: `C:/Users/user/Documents/backmars`. Inspeciona instruções locais aplicáveis em ambos. Preserva todas as alterações existentes; não faças reset, limpeza de ficheiros ou reversão de trabalho anterior. Não faças commit/push, tag/release ou deploy no Raspberry Pi nesta tarefa sem pedido posterior.

Decisões fundamentais:

1. Projeto é dono dos ficheiros; separadores são vistas. Fechar nunca elimina conteúdo.
2. IDs estáveis substituem nomes como identidade. Local, cópia Cloud privada e publicação são entidades relacionadas, mas distintas.
3. Guardar localmente, descarregar, sincronizar e publicar têm efeitos separados e explícitos.
4. Um gestor comum e um conjunto de comandos servem painel Projeto, menus, Cloud e publicações. Não criar cinco exploradores com lógica duplicada.
5. A Cloud é opcional. Falha de rede não é vazio; concorrência não se resolve por relógio; copiar/importar não substitui silenciosamente um homónimo.
6. Publicações continuam snapshots imutáveis com slugs e links fixos estáveis. Nova revisão tem origem explícita e repetição idempotente.
7. IndexedDB v2 transacional, migração recuperável, reciclagem e undo estrutural. Nunca adotar uma nova UI conservando perda de ficheiros ao fechar separadores.

Segue E0–E6 e respetivos gates de IMPLEMENTATION.md. Primeiro reproduz os problemas e protege os dados; depois domínio/persistência, comandos, UI, backend/Cloud, publicação e integração. Reutiliza mecanismos corretos já existentes, sobretudo sanitização pública, ETags, autenticação e gestor de janelas. Não introduzas um framework ou uma reescrita do compilador/simulador.

Adapta os contratos de testes quando o modelo mudar, mantendo as garantias. Acrescenta testes comportamentais para os cenários; asserts de texto no código e screenshots isoladas não provam integridade dos dados. Testa com backend temporário, sem backend, com pedidos lentos e com mudança de conta. Não uses serviços nem bases de dados de produção para fixtures.

Mantém a UI objetiva em PT-PT e traduzível nos vinte idiomas. Usa os scripts existentes para traduzir apenas chaves novas. Integra todas as janelas na infraestrutura atual, com os temas e o modo compacto. Verifica Firefox e Chromium com vários níveis de zoom.

Não pares numa análise, maquete ou implementação só local dizendo que o objetivo está cumprido. Completa frontend e backend, migração, fluxos, testes e documentação. Se surgir uma incompatibilidade real não antecipada, descreve-a, escolhe a solução que preserve trabalho e privacidade e regista a decisão; não voltes silenciosamente a correspondência por nome ou a substituição automática.

Entrega um relatório curto com o que mudou, requisitos cobertos, testes executados, migração/recuperação, limitações concretas e como testar localmente na porta 8081 com BackMars na porta 5000, usando o mesmo hostname. Não prometas funcionalidades que apenas ficaram em documentos.

---

## Decisões que podem variar sem alterar o produto

Nomes de ficheiros/classes, extração incremental de módulos, detalhes internos do esquema físico IndexedDB e mecanismo de pré-visualização/diff podem ser adaptados. Identidade, propriedade, semântica dos verbos, segurança das escritas, compatibilidade dos links e critérios de aceitação não são opcionais.

## Trabalho propositadamente não pedido

Não criar equipas/ACL/colaboração em tempo real, não integrar Git no produto, não alterar a recolha de métricas, não usar a conta do utilizador para testar dados fictícios e não alterar a versão do produto por iniciativa própria.
