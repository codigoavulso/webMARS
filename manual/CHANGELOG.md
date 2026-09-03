# Changelog do Manual do webMARS

Todas as alterações relevantes deste subprojeto são registadas aqui. O formato
segue *Keep a Changelog* e o manual usa versionamento semântico próprio.

## [0.1.1] — 2026-09-03

### Corrigido

- contraste WCAG AA dos textos atenuados nos temas claro e escuro;
- contraste das contagens nos separadores da referência pesquisável;
- testes automáticos para todas as combinações de tokens de texto e superfícies
  de papel usadas pelo Manual.

### Alterado

- fotografia verificável atualizada para o webMARS 0.6.1, commit
  `9835baae3f8d83cd7b522ab798a9f0b7b75483fc`;
- integração da distribuição autónoma no ZIP oficial do webMARS, incluindo o
  Kit Docente, hashes do product lock, módulos e ligações internas;
- referências correntes de comportamento atualizadas para a aplicação 0.6.1;
- mantidas as capturas reais do webMARS 0.6.0 porque esta correção não alterou
  a estrutura nem os fluxos retratados.

## [0.1.0] — 2026-08-29

### Adicionado

- primeira arquitetura editorial completa em português;
- navegação por partes, capítulos e secções, com URLs profundas;
- 20 capítulos numerados, além da entrada, apêndices, cobertura e changelog;
- pesquisa integral no browser, índice do capítulo e navegação anterior/seguinte;
- capítulos de iniciação, interface, projetos, assembler, execução, Mini-C,
  ferramentas, dispositivos MMIO, runtime avançado, preferências e suporte;
- referência pesquisável de instruções básicas, pseudoinstruções e diretivas;
- glossário, mapa de atalhos, mapa de memória e matriz de cobertura funcional;
- apresentação responsiva, impressão limpa, foco visível e preferência de
  movimento reduzido;
- distribuição estática autónoma e validações editoriais automatizadas;
- 35 capturas reais em tema claro — 15 estados gerais e uma para cada uma das
  20 ferramentas — sem informação pessoal;
- protocolo reproduzível que fixa aplicação, idioma, tema, viewport e fixtures;
- Biblioteca pública, ligações estáveis, snapshots sanitizados, revisões imutáveis e arquivo;
- recuperação de password e verificação de email por código temporário;
- Kit Docente e guia completo de self-hosting/Gmail para webMARS 0.6.0.

[0.1.1]: https://github.com/codigoavulso/webMARS/releases/tag/manual-v0.1.1
[0.1.0]: https://github.com/codigoavulso/webMARS/releases/tag/manual-v0.1.0
