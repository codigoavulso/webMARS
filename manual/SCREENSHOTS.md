# Protocolo de capturas do Manual do webMARS

As imagens do manual são evidência visual da versão documentada. Devem ser
reproduzíveis, legíveis e livres de dados pessoais.

## Perfil obrigatório

- aplicação: webMARS `0.6.0`;
- interface: português nos fluxos traduzidos; nomes técnicos internos e algumas
  ferramentas podem conservar a designação original em inglês;
- tema: **Claro**;
- viewport principal: `1280 × 720` píxeis;
- escala/zoom: 100%;
- formato: PNG;
- densidade: 1×, exceto quando a plataforma só expuser 2×;
- conta Cloud: sessão terminada por omissão; os fluxos de publicação e
  verificação usam exclusivamente uma conta de teste descartável;
- projeto: exemplos públicos incluídos no repositório ou fixtures sintéticos,
  sem dados pessoais;
- notificações, extensões e elementos externos: ocultos.

## Nomes e enquadramento

Use nomes ASCII em kebab-case, por exemplo
`03-editor-project-tree-light.png`. Capture apenas a área necessária, mas deixe
visíveis os títulos, separadores ou controlos que orientam o leitor.

## Conjunto v0.1

Editor e Executar são modos mutuamente exclusivos. Ferramentas complexas não
foram agrupadas numa imagem ilegível: a edição v0.1 inclui **35 capturas** —
15 estados gerais e uma janela maximizada para cada uma das 20 ferramentas.

### Estados centrais entregues

| Ficheiro | Estado a capturar |
|---|---|
| `workspace-overview-light.png` | Visão geral da aplicação em tema claro. |
| `workspace-editor-light.png` | Projeto aberto, árvore e Editor. |
| `workspace-execute-light.png` | Segmentos Texto/Dados, E/S e Registos após montagem. |
| `workspace-run-light.png` | Execução concluída, com `$t1 = 120` visível. |
| `minic-compile-light.png` | Fonte Mini-C, log e Assembly gerado. |
| `file-examples-light.png` | Ficheiro → Exemplos, categoria e exemplo abertos; não existe filtro. |
| `settings-interface-light.png` | Definições → Interface com o tema Claro selecionado. |
| `cloud-menu-light.png` | Menu Cloud sem dados pessoais. |
| `help-menu-light.png` | Menu Ajuda e entradas da documentação integrada. |
| `welcome-light.png` | Boas-vindas na primeira visita, com ação inicial selecionada. |
| `library-menu-light.png` | Menu Biblioteca e os seus fluxos públicos. |
| `public-library-search-light.png` | Pesquisa no catálogo público da instalação. |
| `publish-project-light.png` | Publicação explícita do projeto ativo. |
| `password-reset-light.png` | Início da recuperação de password por email/código. |
| `email-verification-light.png` | Introdução do código temporário de verificação. |

### Uma captura por ferramenta

Use o ID no nome `tool-<id>-light.png`. O conjunto entregue é:

`bht-simulator`, `bitmap-display`, `bitmap-terminal-tool`, `cache-simulator`,
`digital-lab-sim`, `float-representation`, `instruction-counter`,
`instruction-statistics`, `intro-to-tools`, `keyboard-display-mmio`, `mars-bot`,
`memory-reference-visualization`, `mips-xray`, `example-register-watch`,
`pipeline-lab`, `scavenger-hunt`, `screen-magnifier`, `stack-visualizer`,
`system-clock` e `tty-ansi-terminal`.

O Bitmap Terminal não possui exemplo dedicado nesta release. O fixture de
captura deriva `bitmap_ascii.c`, substituindo
`bitmap_configure_display(...)` por `bitmap_configure_terminal(...)`, e essa
derivação fica registada neste protocolo.

O Screen Magnifier apresenta os controlos reais, mas o seu preview pode ficar
vazio quando o browser bloqueia a recaptura da própria superfície. Esta é uma
limitação conhecida da captura, não uma simulação do resultado da ferramenta.

## Verificação

Antes de publicar, confirme que cada imagem:

1. pertence à versão indicada;
2. usa o tema claro em todas as janelas e iframes;
3. não contém identificadores pessoais nem conteúdo externo;
4. permanece legível a 1280 px de largura;
5. tem legenda, texto alternativo e referência no capítulo correto.

O email, username, nome público e códigos visíveis numa captura devem pertencer
ao fixture documentado e nunca a uma conta real. Códigos representados não
podem permanecer válidos depois da sessão de captura.
