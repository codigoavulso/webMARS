# Contribuir para o Manual do webMARS

## Princípios editoriais

1. Descrever o comportamento observado na versão compatível, não uma intenção.
2. Explicar primeiro a tarefa do utilizador e só depois o mecanismo interno.
3. Indicar pré-condições, resultado esperado, como confirmar e como recuperar.
4. Marcar claramente diferenças entre MARS 4.5, extensões webMARS e Mini-C.
5. Não incluir credenciais, emails, nomes de conta, IPs ou projetos privados.
6. Manter exemplos mínimos, completos e executáveis.
7. Usar português europeu e conservar os nomes visíveis da interface quando a
   tradução exata for necessária para localizar um comando.

## Estrutura de uma secção operacional

Uma secção que ensina uma tarefa deve, quando aplicável, conter:

- **Quando usar** — objetivo e contexto;
- **Antes de começar** — estado ou configuração necessária;
- **Procedimento** — passos numerados e observáveis;
- **Resultado** — sinais que confirmam sucesso;
- **Problemas frequentes** — causa, diagnóstico e recuperação;
- **Compatibilidade** — limitações ou diferença em relação ao MARS 4.5.

## Exemplos verificados

Os programas completos dos guias práticos vivem em
`content/worked-examples.mjs`. Renderize essas fontes nos capítulos em vez de
manter uma cópia divergente. Registe linguagem/perfil, saída esperada e, quando
relevante, memória e registos a verificar. Distinga fragmentos de programas
completos e explique as condições dos exercícios com falhas intencionais.

No repositório webMARS, `npm run test:manual` executa as fontes e variantes no
compilador e simulador atuais. O manual distribuído não depende desse teste nem
do código do produto. Execute também `npm run validate` na pasta do manual para
confirmar ligações, distribuição e consistência editorial.

## Capturas de ecrã

Siga `SCREENSHOTS.md`. Cada imagem precisa de texto alternativo que descreva a
informação relevante; não repita apenas a legenda. Uma imagem nunca substitui
os passos em texto.

## Alterações de versão

- Atualize `VERSION`, `package.json`, `content/shared.mjs` e `CHANGELOG.md` em
  conjunto.
- Registe a versão webMARS coberta.
- Execute `npm run validate` antes de propor a alteração.
- Uma funcionalidade nova só é considerada documentada quando aparece na
  matriz de cobertura e na pesquisa.
