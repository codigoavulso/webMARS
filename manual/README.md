# Manual do webMARS

![Área de trabalho do webMARS no tema claro](./assets/screenshots/workspace-overview-light.png)

O Manual do webMARS é um subprojeto editorial autónomo, com versão e ciclo de
lançamento próprios. A versão `0.1.0` documenta o webMARS `0.6.0` em português
e foi concebida para poder ser publicada tanto em `/manual/` juntamente com a
aplicação como num alojamento estático independente.

## Objetivos

- explicar o produto desde a primeira execução até aos recursos avançados;
- cobrir todos os menus, vistas, preferências e ferramentas incluídas;
- oferecer uma referência pesquisável de instruções, pseudoinstruções e
  diretivas;
- distinguir comportamento compatível com MARS 4.5 de extensões webMARS;
- manter procedimentos reproduzíveis e imagens reais no tema claro;
- funcionar sem frameworks, serviços externos, cookies ou telemetria.

A edição contém 20 capítulos numerados, apêndices e páginas editoriais, além de
35 capturas reais: 15 estados gerais da aplicação e uma captura para cada uma
das 20 ferramentas.

## Estrutura

- `index.html` — entrada do manual e estrutura acessível da aplicação;
- `content/index.mjs` e `content/chapters-*.mjs` — conteúdo editorial e
  metadados dos capítulos;
- `data/` — catálogos webMARS vendorizados que tornam o build autónomo;
- `product-lock.json` — versão, commit auditado, hashes e contagens dos
  catálogos do produto documentado;
- `assets/` — apresentação, navegação e recursos do manual;
- `scripts/build.mjs` — cria a distribuição autónoma em `dist/`;
- `scripts/serve.mjs` — servidor local da distribuição;
- `tests/manual.test.mjs` — valida cobertura estrutural, ligações e metadados;
- `CHANGELOG.md` — histórico exclusivo do manual;
- `CONTRIBUTING.md` — regras editoriais e de manutenção;
- `SCREENSHOTS.md` — protocolo para capturas de ecrã consistentes;
- `VERSION` — versão editorial corrente, independente da aplicação.

## Utilização

```text
npm run validate
npm run serve
```

O servidor local anuncia o endereço do manual. Dentro do repositório principal,
`/manual/` também abre diretamente a versão fonte; o build inclui cópias dos
dados de referência e das imagens necessárias para que `dist/` seja autónomo.

O build, os testes e a versão publicada não consultam o repositório webMARS.
Ao preparar uma nova edição, o mantenedor atualiza deliberadamente a fotografia
auditável do produto a partir de um checkout ou commit selecionado:

```text
npm run vendor:product -- --product-root <checkout-webmars>
npm run vendor:product -- --product-root <checkout-webmars> --commit <hash-completo> --verified-at AAAA-MM-DD
```

Sem `--commit`, o lock fica marcado como pendente e não afirma uma verificação
que ainda não aconteceu. Com um commit, os ficheiros são lidos diretamente
desse objeto Git e os respetivos hashes ficam registados no lock.

## Versionamento

O manual usa versionamento semântico independente da aplicação:

- **patch** — correções editoriais sem alterar a cobertura;
- **minor** — novos capítulos, fluxos ou cobertura de uma versão webMARS;
- **major** — reorganização incompatível de URLs, formato ou público-alvo.

As releases usam o prefixo de tag `manual-v`, por exemplo
`manual-v0.1.0`, para não colidirem com as tags da aplicação.

A versão compatível da aplicação é sempre mostrada no cabeçalho e registada no
changelog. Uma nova versão do webMARS não muda automaticamente a versão do
manual.
