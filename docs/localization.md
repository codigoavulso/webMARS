# Localização

O webMARS fala 20 idiomas. Este documento descreve como os catálogos são
mantidos, o que é verificado automaticamente e o que continua por decidir.

## Dois tipos de catálogo

| Catálogo | Idiomas | Mantido por |
| --- | --- | --- |
| Fonte | `en` | À mão. É a chave de todas as outras traduções. |
| Revisto | `es`, `pt` | À mão, por uma pessoa. |
| Gerado | os restantes 17 | Por script, a partir de `en`. |

Um catálogo gerado não é pior por ser gerado — é apenas não revisto. A
distinção existe para que nenhuma ferramenta automática reescreva trabalho
humano.

## Regra fundamental: nunca correr o gerador completo para acrescentar chaves

`scripts/generate-locales.mjs` reescreve todos os catálogos, todas as páginas de
ajuda e todos os exemplos a partir do zero. É a ferramenta certa para
acrescentar um idioma e a ferramenta errada para acrescentar uma cadeia: uma
execução completa também volta a traduzir entradas que entretanto foram
corrigidas à mão, pelo que uma funcionalidade que acrescenta dez chaves pode
degradar milhares silenciosamente.

Para acrescentar chaves use:

```bash
npm run i18n:new-keys -- --apply
```

`scripts/translate-new-keys.mjs` faz só o trabalho estreito: encontra as chaves
que um catálogo gerado ainda responde em inglês, traduz essas, e substitui-as no
ficheiro existente sem tocar em mais nenhuma linha. `en`, `es` e `pt` nunca são
tocados.

Sem `--apply` produz apenas um relatório. `--language de,fr` limita os idiomas e
`--limit N` limita as chaves, o que é útil para inspecionar o resultado antes de
o aplicar a tudo.

### Proteções

- **Marcadores técnicos.** `{placeholders}`, `$registos`, `0x...`, `webMARS`,
  `MIPS`, `Mini-C` e siglas em maiúsculas são mascarados antes de seguirem para
  o tradutor e repostos depois, com a mesma expressão que o gerador usa. As duas
  têm de concordar, ou a mesma cadeia seria mascarada de forma diferente
  consoante o último script a tocar-lhe.
- **Placeholders.** Uma tradução que perca ou invente um `{placeholder}` é
  recusada e a entrada fica em inglês. Uma substituição partida em tempo de
  execução é pior do que uma cadeia por traduzir.
- **Lotes desalinhados.** Se o serviço devolver um número de segmentos
  diferente do enviado, o lote é repetido cadeia a cadeia em vez de adivinhado:
  um lote desalinhado atribuiria cada tradução à chave errada.

O serviço de tradução é externo. As cadeias enviadas são texto de interface
deste repositório; nenhum dado de utilizador passa por ali.

## O que é verificado automaticamente

| Verificação | Onde |
| --- | --- |
| Toda a cadeia visível tem entrada em `en.js`. | `scripts/check-i18n-coverage.mjs` |
| Todos os catálogos têm todas as chaves de `en`. | `tests/release-readiness.test.mjs` |
| Nenhuma tradução altera os `{placeholders}`. | `tests/release-readiness.test.mjs` |
| Nenhum catálogo repete uma chave. | `tests/release-readiness.test.mjs` |
| Nenhuma localização contém marcadores de tradução por limpar. | `tests/release-readiness.test.mjs` |
| Nenhum idioma responde mais interface em inglês do que respondia. | `tests/localization-parity.test.mjs` |
| O Pipeline Lab fala os 20 idiomas. | `tests/localization-parity.test.mjs` |

Os tetos em `tests/localization-parity.test.mjs` são **pisos de regressão, não
metas**, tal como os limiares de cobertura: descem quando o trabalho é feito e
nunca sobem para fazer passar uma execução. Uma cadeia deixada por traduzir faz
falhar a suite.

## O resto em inglês não é todo por traduzir

O teste conta entradas cujo valor é idêntico ao inglês, e muitas são-no de
propósito:

- termos que este projeto mantém em inglês por serem os usados na literatura de
  arquitetura — `forwarding`, `delay slot`, `heap`, `trap`, `hit`, `miss`;
- nomes próprios — `MIPS X-Ray`, `Mars Bot`, `Digital Lab Sim`, `Mini-C`;
- rótulos que se escrevem igual — `Layout`, `Menu`, `Editor`, `Hex`, `Float`;
- cadeias que são quase só placeholders — `PC: {pc}`, `[mini-c] {entry}`.

Por isso nenhum teto é zero, e por isso o número por si só não é uma medida de
qualidade da tradução.

## O que continua por decidir

Duas decisões pertencem a quem domina o português e o espanhol técnicos, e não
a um script:

1. **Terminologia de arquitetura.** Manter `forwarding` e `delay slot` em
   inglês é a prática comum no ensino em português, mas é uma escolha, não um
   facto. Está por rever com falantes tecnicamente competentes.
2. **Prompts com palavras-chave.** `"{message} [yes/no/cancel]"` está em inglês
   porque o texto e o que o runtime aceita como resposta têm de mudar juntos.
   Traduzir o prompt sem traduzir o parser transformaria uma tradução numa
   avaria.

Enquanto não forem decididas, ficam registadas aqui em vez de darem uma
impressão falsa de trabalho pendente.
