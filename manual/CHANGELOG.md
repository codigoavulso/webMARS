# Changelog do Manual do webMARS

Todas as alterações relevantes deste subprojeto são registadas aqui. O formato
segue *Keep a Changelog* e o manual usa versionamento semântico próprio.

## [0.2.1] — 2026-10-22

### Adicionado

- 13 secções práticas com exercícios, resultados esperados e diagnóstico;
- seis programas completos partilhados entre o texto e os testes de execução;
- verificações de output, memória, stack, registos e variantes dos exercícios;
- manual numa janela integrada na aplicação, com tema sincronizado, pesquisa
  e abertura do capítulo/secção corrente num separador independente;
- filtro de capítulos por título, resumo e palavras-chave, e guias por tarefa;
- procedimento para associar Google e fundir contas Cloud já existentes;
- leitura dos separadores Panorâmica, Recursos e atividade Cloud, comparação
  de períodos e exportação CSV com limites de interpretação.

### Alterado

- contrato da soma corrigido para não prometer um resultado positivo;
- limites do exemplo de handler explicitados para interrupções e delay slots;
- leitura compacta dentro da app, navegação responsiva e cartões de percursos;
- entrada social da instalação oficial descrita como Google;
- abertura de projetos Cloud e gestão de publicações descritas em vista de tabela;
- legendas de capturas históricas explicitam as diferenças da interface atual.

## [0.2.0] — 2026-10-20

### Adicionado

- início de sessão social opcional, associação de contas e configuração dos fornecedores;
- classificação de público e comparação entre visitas, sessões e atividade Cloud;

- capítulo de Estatísticas de utilização: últimos 60 minutos, 24 horas e
  30 dias, seis indicadores principais, 12 medições, gráficos, filtros e tabelas;
- interpretação de sessões, novas sessões, interação, presença, mediana e P90,
  distinguindo visitas, contas Cloud e resultados educativos;
- instalação do coletor, retenção, agregados públicos e diagnóstico do painel;
- captura real do painel com dados sintéticos, elevando o conjunto a 36 imagens.

### Alterado

- produto documentado: webMARS 0.6.4, commit
  `09afa3008c95b21e2f988e7b3708335d35d16a4f`, verificado em 2026-10-20;
- Biblioteca pública em vista de detalhe, pesquisa no servidor, páginas de
  25 resultados, seleção, metadados e navegação por teclado;
- capturas da Biblioteca pública e menu Ajuda atualizadas para a interface 0.6.3;
- mapa de dados, recolha automática e Kit Docente atualizados; as 33 capturas
  dos fluxos que não mudaram conservam a proveniência 0.6.0;
- cobertura expandida para 21 capítulos numerados, mantendo as URLs anteriores;
- catálogos locais e hashes do product lock atualizados para a edição auditada.

### Corrigido

- a entrada histórica 0.1.1 apresenta os seus próprios commit e versão, sem
  herdar dinamicamente os metadados de edições posteriores;
- esclarecido que `vendor/` serve os testes da aplicação e não o alojamento.
- a edição no cabeçalho passa a derivar dos metadados do Manual, tal como o título da página.

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

[0.2.1]: https://github.com/codigoavulso/webMARS/releases/tag/manual-v0.2.1
[0.2.0]: https://github.com/codigoavulso/webMARS/releases/tag/manual-v0.2.0
[0.1.1]: https://github.com/codigoavulso/webMARS/releases/tag/manual-v0.1.1
[0.1.0]: https://github.com/codigoavulso/webMARS/releases/tag/manual-v0.1.0
