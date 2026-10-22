# Desenho funcional da interface

## 1. Organização

Criar uma janela principal **Projetos**, única por sessão, registada no gestor de janelas atual. As vistas não criam novas janelas para cada pesquisa ou ação. O painel **Projeto** da janela Principal mantém apenas a árvore do projeto ativo e atalhos Novo/Importar/Gerir projetos. Reutiliza modelos, seleção e comandos do gestor completo; não mantém outra lógica de ficheiros.

```text
┌ Projetos ──────────────────────────────────────────── _ □ × ┐
│ Neste dispositivo > Exercício 3 > src                       │
│ [Novo ▾] [Importar] [Pesquisar nesta vista........] [↻] [⋯] │
├──────────────────┬─────────────────────────────┬────────────┤
│ Neste dispositivo│ Nome       Tipo  Modificado │ Detalhes   │
│ Cloud            │ ▸ include  Pasta ...        │ main.c     │
│ Biblioteca pública│  main.c   Mini-C ...       │ 42 linhas  │
│ Minhas publicações│  main.s   Assembly ...     │ 1,8 KB     │
│ Reciclagem       │                             │ Prévia     │
│                  │                             │            │
├──────────────────┴─────────────────────────────┴────────────┤
│ 3 itens · 1 selecionado        [Abrir projeto]       [Fechar]│
└────────────────────────────────────────────────────────────┘
```

Esta grelha representa regiões, não uma exigência de copiar as dimensões do desenho. Usar áreas nomeadas: `navigation`, `toolbar`, `content`, `inspector`, `status`. Ocultar uma região nunca reposiciona outra por auto-placement. A lista ocupa o espaço flexível; detalhes e rodapé não recebem a altura livre por acidente.

## 2. Dimensões e consistência visual

- Janela inicial 1040×640 CSS px, limitada ao desktop disponível; não forçar uma dimensão maior que o ecrã.
- Navegação 164 px; inspetor 280 px, redimensionável/ocultável; conteúdo com `min-width:0` e `min-height:0`.
- Linhas de 28 px no desktop, alvos de pelo menos 40 px em toque. Não usar cartões gigantes para metadados simples.
- Barra de ações com ícone e texto; ícones da família existente, sem emoji como substituto de comandos. Ações secundárias no menu contextual `⋯`.
- Nome/título tem prioridade de largura. Metadados secundários truncam com tooltip e estão disponíveis no inspetor. Cabeçalhos fixos, ordenáveis e com estado acessível.
- Cores, contornos, tipografia e seleção usam tokens existentes; sem uma segunda linguagem visual dentro da app.
- Abaixo de 900 px, ocultar o inspetor por defeito e abri-lo com «Detalhes». Abaixo de 620 px, navegação passa a seletor de localização, linhas mostram nome + uma linha de metadados. Filtros avançados abrem numa área recolhível; nenhum comando essencial depende de hover.
- A seleção é visual e acessível, não apenas uma cor. Foco e seleção são estados separados.

## 3. Localizações e colunas

| Vista | Conteúdo e colunas principais | Ação principal |
|---|---|---|
| Neste dispositivo | Projetos: Nome, Estado Cloud, Modificado, Ficheiros, Tamanho | Abrir projeto |
| Ficheiros de um projeto | Nome, Tipo, Tamanho, Modificado; caminho em pesquisa | Abrir ficheiro / Abrir projeto |
| Cloud | Nome, Estado da cópia local, Modificado, Tamanho | Abrir projeto |
| Biblioteca pública | Título, Autor, Tipo, Idioma, Atualizado; slug/dificuldade/tags no detalhe | Consultar |
| As minhas publicações | Título, Visibilidade, Revisão, Projeto de origem, Atualizado | Consultar |
| Reciclagem | Nome, Tipo, Origem, Eliminado em | Restaurar |

Na raiz local, os nomes de projetos não precisam de um sufixo artificial `.p` para parecerem ficheiros. Formatos de exportação continuam identificáveis pelo respetivo nome quando descarregados. As bibliotecas globais surgem num grupo separado no painel Projeto, com indicação Só de leitura.

Breadcrumbs representam navegação dentro do gestor. Voltar/Sair da pasta nunca muda o projeto ativo. Abrir explicitamente um projeto pode mudar o projeto ativo, depois de persistir o anterior.

## 4. Interação

| Gesto | Comportamento |
|---|---|
| Clique simples | Selecionar e mostrar metadados; zero mutações. |
| Enter / duplo clique numa pasta | Entrar na pasta. |
| Enter / duplo clique num projeto | Consultar os ficheiros dentro do gestor; não mudar o editor. |
| Enter / duplo clique num ficheiro local | Abrir no editor; se pertence a outro projeto, confirmar primeiro a troca de contexto. |
| Enter / duplo clique numa publicação | Abrir consulta com metadados, revisões e ficheiros. |
| Abrir projeto | Guardar projeto atual, ativar o escolhido e focar o editor. |
| Criar cópia e abrir | Importar publicação como projeto local independente e abri-lo. |
| Botão direito / ⋯ / Shift+F10 | Mesmo menu contextual, calculado pelas permissões. |
| Ctrl/Cmd+A na lista | Selecionar a página/resultado carregado; nunca seleção remota invisível. |
| F2 | Renomear um item editável. |
| Delete | Mover selecionados para reciclagem, com resumo quando inclui pastas/projetos. |
| Escape | Fechar menu/inspeção transitória primeiro, depois limpar seleção; fechar janela apenas sem contexto pendente. |
| Ctrl/Cmd+S no editor | Confirmar gravação local do projeto ativo, sem downloads ou publicação. |

Atalhos Copy/Cut/Paste estruturais só atuam quando o foco pertence à lista/árvore; dentro do editor continuam a copiar/cortar/colar texto. A área de transferência estrutural guarda IDs e revisão dos itens; Colar revalida o estado. Cortar só remove a origem após a transação de destino ter sido confirmada. Desfazer estrutural é acessível no menu do gestor e na notificação da operação; Ctrl+Z dentro do editor mantém o significado atual.

Nenhuma seleção automática do primeiro resultado deve preparar uma ação destrutiva. A navegação por setas seleciona de forma explícita; ao apagar a última linha da página, carregar a anterior sem executar ações sobre o novo primeiro item.

## 5. Inspeção e consulta pública

O inspetor mostra nome completo, caminho, origem, tamanho, data e estados aplicáveis. Não repete todas as colunas nem reserva um bloco vazio quando não há seleção. Um ficheiro tem pré-visualização de fonte só de leitura, com limites e mensagem «Abrir ficheiro» para consultar tudo quando necessário.

A consulta de publicação permanece no contexto do gestor e contém três secções: **Apresentação**, **Ficheiros**, **Revisões**. A revisão escolhida é visível junto ao título. A árvore permite escolher ficheiro e ver fonte sem executar. As ações finais são **Criar cópia e abrir**, **Copiar ligação** e Voltar. Para o proprietário, acrescentar **Editar publicação** e **Nova revisão**. Mostrar a licença e a origem antes de criar cópia.

## 6. Estados de interface obrigatórios

| Estado | Conteúdo visível | Recuperação |
|---|---|---|
| Primeiro carregamento | Indicador compacto «A carregar…», área da lista estável | Cancelar/fechar permitido |
| Atualização | Manter linhas anteriores; «A atualizar…» | Não habilitar mutações sobre dados obsoletos |
| Sucesso vazio local | «Ainda não criou projetos.» | Criar projeto / Importar |
| Sucesso vazio público | «Ainda não há projetos públicos.» | Atualizar; publicar apenas se aplicável |
| Filtro sem resultados | «Nenhum resultado para estes filtros.» | Limpar filtros |
| Falha sem cache | «Não foi possível carregar a biblioteca.» | Tentar novamente |
| Offline com cache | Linhas guardadas + «Sem ligação · dados de …» | Tentar novamente; ações locais continuam |
| Sessão expirada | Conteúdo privado oculto/invalidado; «Inicie sessão para continuar.» | Iniciar sessão sem perder o destino |
| Acesso negado / removido | Mensagem própria para o recurso selecionado | Voltar à lista |
| Erro de gravação local | «Não foi possível guardar.» | Exportar alterações / Tentar novamente |
| Conflito | Estado persistente na linha e painel de comparação | Resolver; continuar trabalho local |

O estado tem uma só fonte de verdade. Não mostrar «0 itens», «Página 1» ou «Ainda não há projetos» durante erro. Um detalhe técnico expansível pode mostrar diagnóstico útil sem credenciais. A mensagem principal não inclui URL, stack trace ou SQL.

## 7. Formulários e operações

- **Novo projeto**: nome, modelo e botão Criar; gravação local primeiro. Cloud é uma ação posterior explícita.
- **Importar**: escolher origem → analisar → mostrar árvore/conflitos/limites → confirmar. Cancelar não escreve nada.
- **Renomear/mover/copiar**: nome/destino com prévia das colisões; manter o item selecionado por ID após a operação.
- **Publicar**: 1) projeto e ficheiros, 2) apresentação e visibilidade, 3) resumo e Publicar. Conservar o formulário após falha; ações repetidas bloqueadas enquanto a operação está em curso.
- **Nova revisão**: origem + destino + diferença da revisão anterior + Publicar revisão. Não usar um seletor genérico de «Ação» seguido de «Continuar».
- **Conflito Cloud**: lista Adicionado/Alterado/Removido/Renomeado dos dois lados; prévia da diferença textual por ficheiro, mais opções de preservar as duas versões. A gravação final volta a validar o ETag.
- **Eliminar**: nome, contagem e âmbito concretos. Publicações, cópias locais e cópias Cloud não são agrupadas numa confirmação vaga.

## 8. Menus existentes

Ficheiro → Gerir projetos abre Neste dispositivo. Cloud → Projetos abre Cloud. Biblioteca → Explorar abre Biblioteca pública; As minhas publicações abre essa vista. Abrir ligação pública continua a aceitar slugs/URLs e abre a mesma consulta pública. Publicar projeto abre o fluxo de publicação, não outra implementação. Ficheiro → Abrir do computador mantém o seletor nativo e encaminha o resultado para o serviço comum de importação.

Todas as janelas secundárias usam o sistema existente. Restaurar o layout pode restaurar a localização do gestor, mas nunca republicar, eliminar, sincronizar ou reexecutar um comando anterior.
