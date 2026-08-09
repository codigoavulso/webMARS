# webMARS v0.6.0 - Roadmap

Este documento orienta o desenvolvimento do webMARS até à versão 0.6.0.
O objetivo central é transformar a amplitude funcional atual numa plataforma
educativa e científica que possa ser avaliada, reproduzida e comparada com
outros simuladores MIPS de forma credível.

## Visão para a v0.6.0

A v0.6.0 deverá apresentar o webMARS como:

- um ambiente MIPS32/MARS completo e portátil no browser;
- uma ferramenta pedagógica que explica, em vez de apenas executar;
- uma plataforma com resultados mensuráveis e exportáveis;
- um projeto cuja compatibilidade, desempenho e correção têm evidência pública;
- uma base extensível para novas ferramentas e experiências de arquitetura;
- uma aplicação acessível, localizada e adequada a aulas em desktop e mobile.

## Princípios

- Preservar a compatibilidade prática com o MARS 4.5.
- Manter um único runtime funcional JavaScript como fonte de verdade da ISA.
- Implementar o Pipeline Lab como um modo educativo separado e explícito.
- Não apresentar o runtime normal como cycle-accurate.
- Associar cada afirmação pública a testes, medições ou documentação verificável.
- Favorecer experiências reproduzíveis em vez de demonstrações preparadas à mão.
- Manter a interface útil para principiantes sem limitar utilizadores avançados.
- Garantir paridade funcional e documental entre os idiomas suportados.

## P0 - Preparação para comparativos

### Matriz de compatibilidade

- [x] Criar `docs/comparison-matrix.md`.
- [x] Inventariar todas as instruções MIPS32 suportadas.
- [x] Inventariar pseudo-instruções e formatos aceites pelo assembler.
- [x] Inventariar diretivas, macros, syscalls, exceções e dispositivos MMIO.
- [x] Classificar cada capacidade como `completa`, `parcial`, `extensão webMARS`
      ou `não suportada`.
- [x] Documentar diferenças conhecidas relativamente ao MARS 4.5.
- [x] Documentar diferenças relativamente ao modelo de Patterson e Hennessy.
- [x] Ligar cada linha da matriz aos testes ou exemplos que a demonstram.

### Evidência e publicação

- [x] Adicionar `CITATION.cff` com autores, versão, licença e URL do projeto.
- [x] Criar uma página pública "Comparison and Evidence".
- [x] Publicar limitações conhecidas sem linguagem ambígua.
- [x] Definir um formato estável para relatórios de compatibilidade.
- [ ] Produzir screenshots e vídeos versionados das funcionalidades principais.
- [ ] Preparar uma release arquivável no Zenodo ou serviço equivalente.
- [ ] Atribuir DOI a uma release de referência, quando o projeto estiver pronto.
- [x] Disponibilizar um resumo técnico adequado a artigos e trabalhos académicos.
- [x] Nomear sempre os critérios de comparação; evitar colunas opacas como A/B/C/D.

### Critérios de aceitação de P0

- [x] Um leitor externo consegue verificar uma afirmação sem consultar o autor.
- [x] A matriz distingue claramente comportamento funcional e timing arquitetural.
- [x] A documentação identifica a versão exata a que cada resultado corresponde.
- [x] Não existem afirmações de compatibilidade sem evidência associada.

## P1 - Pipeline Lab

O Pipeline Lab será a principal nova capacidade pedagógica da v0.6.0. Deve ser
um modelo isolado do runtime funcional, com configuração, estado e resultados
próprios, reutilizando o assembler e as representações de instruções sempre que
isso não introduzir dependências incorretas.

### Modelo base

- [x] Definir formalmente o pipeline de cinco estágios: IF, ID, EX, MEM e WB.
- [x] Definir o estado de cada estágio e de cada registo de pipeline por ciclo.
- [x] Modelar bubbles, stalls, flushes e conclusão de instruções.
- [x] Modelar hazards estruturais, de dados e de controlo.
- [x] Modelar forwarding configurável.
- [x] Modelar delay slots configuráveis.
- [x] Modelar resolução e penalização de branches.
- [x] Definir o comportamento de exceções no pipeline.
- [x] Definir claramente instruções não suportadas pelo modelo cycle-accurate.
- [x] Garantir resultados determinísticos para a mesma configuração e programa.

### Configurações arquiteturais

- [x] Pipeline simples sem forwarding.
- [x] Pipeline com forwarding.
- [x] Pipeline com e sem delay slot.
- [x] Previsão estática always-not-taken.
- [x] Previsão estática always-taken.
- [x] Integração opcional com o Branch History Table Simulator.
- [x] Latência configurável da memória.
- [x] Perfis predefinidos e identificados por versão.
- [x] Comparação lado a lado entre duas configurações.

### Vista "Aprender"

- [x] Mostrar os cinco estágios como blocos simples e legíveis.
- [x] Mostrar uma linha temporal instrução/ciclo.
- [x] Sincronizar código-fonte, instrução montada e estágio atual.
- [x] Explicar a causa de cada stall, bubble ou flush.
- [x] Destacar dependências entre instruções.
- [x] Mostrar caminhos de forwarding com linguagem acessível.
- [x] Disponibilizar tooltips e explicações contextuais.
- [x] Permitir avançar e recuar um ciclo.
- [x] Permitir selecionar uma instrução e seguir todo o seu percurso.

### Vista "Registos"

- [x] Reproduzir a execução real do webMARS no modelo de ciclos.
- [x] Mostrar o valor de cada registo no ciclo atual.
- [x] Mostrar os valores que ainda não chegaram ao banco de registos.
- [x] Mostrar os valores de cada registo ao longo dos ciclos.
- [x] Identificar cada instrução pelo passo webMARS que a produziu.
- [x] Distinguir os dois relógios em todas as leituras da interface.
- [x] Exportar as escritas confirmadas por ciclo.
- [x] Avançar e recuar por instrução webMARS, além de por ciclo.
- [x] Conduzir o passo e o passo atrás do webMARS a partir da ferramenta.
- [x] Acompanhar o passo atrás do webMARS no registo da execução.

### Vista "Arquitetura"

- [x] Desenhar o datapath completo do pipeline.
- [x] Mostrar registos de pipeline e sinais de controlo.
- [x] Mostrar multiplexadores e caminhos selecionados no ciclo atual.
- [x] Mostrar valores de entrada e saída dos componentes relevantes.
- [x] Mostrar caminhos de forwarding e deteção de hazards.
- [x] Permitir ocultar grupos de sinais para reduzir ruído visual.
- [x] Manter a seleção sincronizada com a vista "Aprender".

### Métricas e exportação

- [x] Contabilizar ciclos, instruções concluídas e CPI.
- [x] Contabilizar stalls, bubbles, flushes e hazards por tipo.
- [x] Contabilizar branches, previsões e falhas de previsão.
- [x] Comparar automaticamente duas configurações.
- [x] Exportar resultados em JSON e CSV.
- [x] Exportar uma linha temporal reproduzível da execução.
- [x] Incluir versão do webMARS, perfil e hash do programa em cada relatório.

### Correção do Pipeline Lab

- [x] Criar testes por instrução e por sequência de dependências.
- [x] Criar testes específicos para todos os tipos de hazard.
- [x] Criar testes de forwarding e stalls esperados por ciclo.
- [x] Criar programas de referência com diagramas temporais aprovados.
- [x] Comparar resultados com exemplos publicados de Patterson e Hennessy.
- [x] Testar importação/exportação e backstep por ciclo.
- [x] Separar explicitamente testes funcionais da ISA e testes de microarquitetura.
- [x] Testar a reprodução de execuções registadas e a origem de cada valor.

## P2 - Pacote pedagógico

### Laboratórios guiados

- [x] Criar uma sequência introdutória sobre os cinco estágios.
- [x] Criar um laboratório de hazards de dados.
- [x] Criar um laboratório de forwarding.
- [x] Criar um laboratório de branches e flushes.
- [x] Criar um laboratório de previsão de branches.
- [x] Criar um laboratório de CPI e otimização de código.
- [x] Criar um laboratório de memória e cache.
- [x] Incluir objetivos, pré-requisitos, passos e perguntas de reflexão.
- [x] Permitir que o aluno preveja o resultado antes de executar.
- [x] Comparar a previsão do aluno com a execução real.

### Apoio a docentes

- [x] Criar um guia de adoção para docentes.
- [x] Criar fichas de laboratório imprimíveis.
- [x] Criar soluções separadas das fichas dos alunos.
- [x] Criar conjuntos de programas com dificuldade progressiva.
- [x] Permitir exportar resultados anónimos para avaliação.
- [x] Documentar formas de usar o webMARS em aulas e demonstrações.
- [x] Preparar uma apresentação curta sobre o Pipeline Lab.

### Critérios de aceitação de P2

- [x] Um docente consegue realizar um laboratório sem assistência do autor.
- [ ] Um aluno consegue explicar a causa de um stall depois do laboratório.
- [x] Todos os materiais indicam versão, duração e conhecimentos prévios.
- [x] Os exemplos são validados automaticamente pela suite de testes.

## P3 - Correção, cobertura e desempenho

### Compatibilidade e testes diferenciais

- [x] Criar uma suite automática webMARS versus MARS 4.5.
- [x] Comparar montagem, diagnósticos, memória, registos e output final.
- [x] Definir regras para diferenças intencionais.
- [x] Guardar casos mínimos para cada regressão encontrada.
- [x] Publicar um resumo da conformidade por release.

### Cobertura e robustez

- [x] Medir statement, branch e function coverage do JavaScript.
- [x] Definir limiares mínimos para os módulos críticos.
- [x] Introduzir mutation testing no assembler e runtime.
- [x] Medir a capacidade dos testes para detetar mutações relevantes.
- [x] Adicionar fuzzing limitado ao parser, assembler e importação de estado.
- [x] Testar projetos grandes, programas longos e estados de memória extremos.
- [x] Publicar resultados sem confundir quantidade de testes com cobertura real.

### Benchmark oficial

- [x] Definir programas representativos e respetivos objetivos.
- [x] Medir compilação Mini-C, montagem, execução e ferramentas conectadas.
- [x] Definir warm-up, número de repetições e tratamento de outliers.
- [x] Registar browser, sistema operativo, CPU, memória e versão.
- [ ] Automatizar benchmarks em pelo menos Chrome e Firefox.
- [x] Publicar medianas, dispersão e tamanho das amostras.
- [x] Guardar resultados históricos para detetar regressões.
- [x] Permitir executar localmente o mesmo protocolo publicado.

## P4 - Modularidade e extensibilidade

### API para ferramentas

- [x] Documentar o ciclo de vida de uma ferramenta.
- [x] Documentar snapshots, eventos, deltas e histórico central.
- [x] Definir contratos estáveis para leitura e escrita de memória/MMIO.
- [x] Definir contratos de tradução e atualização de idioma.
- [x] Definir contratos para janelas, mobile e acessibilidade.
- [x] Versionar a API pública das ferramentas.
- [x] Criar uma ferramenta mínima de exemplo.
- [x] Criar um template de ferramenta completa com testes.
- [x] Impedir que uma ferramenta com falhas interrompa o runtime.

### Documentação de programador

- [x] Atualizar os diagramas da arquitetura do código.
- [x] Explicar as fronteiras entre assembler, runtime, UI, armazenamento e tools.
- [x] Criar um guia "primeira contribuição".
- [x] Criar um guia para adicionar instruções e pseudo-instruções.
- [x] Criar um guia para adicionar syscalls e dispositivos MMIO.
- [x] Documentar invariantes de memória, snapshots e backstep.
- [x] Documentar o processo de release e compatibilidade entre versões.

### Validação por terceiros

- [ ] Pedir a pelo menos dois contribuidores externos que criem uma ferramenta.
- [ ] Registar tempo, dúvidas, erros e alterações necessárias no core.
- [ ] Pedir a implementação de uma extensão simples de arquitetura.
- [ ] Rever a API e documentação a partir dos resultados.
- [ ] Publicar um relatório anónimo da experiência.

## P5 - Usabilidade, acessibilidade e portabilidade

### Estudo de usabilidade

- [x] Definir perguntas de investigação antes de recolher dados.
- [ ] Recrutar estudantes e docentes com consentimento informado.
- [ ] Usar pelo menos 20 participantes, se possível.
- [ ] Aplicar pré-teste e pós-teste de conhecimentos.
- [ ] Medir tempo, erros e conclusão de tarefas.
- [ ] Aplicar SUS, UEQ ou instrumento equivalente.
- [ ] Comparar a vista simples com a vista arquitetural.
- [ ] Anonimizar e publicar metodologia, amostras e resultados agregados.
- [ ] Declarar limitações e evitar conclusões acima da evidência disponível.

### Acessibilidade

- [ ] Realizar auditoria WCAG 2.2 AA.
- [x] Garantir navegação integral por teclado.
- [x] Definir ordem de foco previsível nas janelas e ferramentas.
- [ ] Validar nomes acessíveis e anúncios para leitores de ecrã.
- [x] Não depender apenas da cor para identificar estágios ou hazards.
- [x] Disponibilizar paleta adequada a diferentes formas de daltonismo.
- [x] Validar contraste nos temas claro e escuro.
- [x] Suportar redução de movimento.
- [x] Testar zoom elevado e tamanhos de letra maiores.
- [x] Publicar uma declaração de acessibilidade e limitações conhecidas.

### Portabilidade

- [ ] Testar Chrome, Firefox, Edge e Safari nas versões suportadas.
- [ ] Testar Windows, Linux e macOS.
- [ ] Testar Android e iOS em tamanhos representativos.
- [x] Criar uma matriz pública browser/plataforma/funcionalidade.
- [x] Avaliar modo offline/PWA sem comprometer atualização e segurança.
- [x] Garantir que relatórios exportados funcionam sem backend.

### Localização

- [x] Garantir paridade completa entre todos os idiomas suportados.
- [ ] Rever terminologia de arquitetura com falantes tecnicamente competentes.
- [x] Validar RTL no Pipeline Lab, gráficos e relatórios.
- [x] Garantir que diagramas não contêm texto fixo não traduzível.
- [x] Incluir idioma e versão nos materiais pedagógicos exportados.

## Entregáveis da v0.6.0

- [x] Pipeline Lab funcional com vista "Aprender" e vista "Arquitetura".
- [x] Pelo menos quatro configurações arquiteturais comparáveis.
- [x] Métricas e exportação JSON/CSV reproduzíveis.
- [x] Matriz pública de compatibilidade e limitações.
- [x] Suite diferencial com MARS 4.5.
- [x] Relatório de cobertura e benchmark oficial.
- [x] Primeiro conjunto de laboratórios para alunos e docentes.
- [x] API de ferramentas documentada e versionada.
- [x] Documentação de programador atualizada.
- [x] Auditoria inicial de acessibilidade.
- [x] Matriz de portabilidade entre browsers e plataformas.
- [x] `CITATION.cff` e pacote de evidências da release.
- [x] Changelog e documentação atualizados em todos os idiomas suportados.

## Definição de concluído

A v0.6.0 só deverá ser publicada quando (verificado em 2026-08-08 contra a
árvore em 0.5.5; marcar uma condição não significa que a release esteja
cortada):

- [x] todos os testes automáticos passarem;
- [x] o build e o pacote de release forem reproduzíveis;
- [ ] não existirem regressões conhecidas de alta severidade;
- [x] as capacidades novas tiverem documentação de utilizador e programador;
- [x] os resultados publicados puderem ser reproduzidos por terceiros;
- [x] o Pipeline Lab declarar claramente o perfil arquitetural utilizado;
- [x] o runtime funcional continuar compatível com os projetos existentes;
- [x] desktop e mobile tiverem sido verificados visualmente;
- [x] os idiomas suportados tiverem paridade estrutural e funcional;
- [x] limitações, metodologia e tamanho das amostras estiverem explícitos;
- [ ] a release tiver uma referência citável e um arquivo permanente.

## Fora do âmbito obrigatório da v0.6.0

Estes objetivos podem ser explorados, mas não devem bloquear a release:

- simulação elétrica ou ao nível de portas lógicas;
- suporte completo para múltiplas ISAs;
- simulação superscalar, out-of-order ou multiprocessador;
- substituição do runtime funcional atual pelo Pipeline Lab;
- equivalência temporal com um processador MIPS físico específico;
- backend obrigatório para executar programas ou laboratórios;
- recolha de dados pessoais ou telemetria sem consentimento explícito.

## Registo de decisões

As decisões que alterem o âmbito ou os princípios acima devem ser registadas
nesta secção com data, motivação e impacto.

- **2026-08-08 — Hipótese declarada para o resultado dos branches.** O Pipeline
  Lab não executa o programa, pelo que não pode observar o resultado real de um
  branch. Em vez de inventar um resultado, o modelo declara a hipótese usada:
  `sequential` (omissão, queda para a instrução seguinte) ou `backward-taken`
  com número máximo de iterações. Motivação: garantir terminação e determinismo
  sem sugerir que o modelo executa o programa. Impacto: a previsão
  always-taken falha sempre em `sequential`; a hipótese aparece na interface e
  em todos os relatórios exportados.

- **2026-08-08 — Saltos incondicionais previstos corretamente no fetch.** `j`,
  `jal` e `bal` com destino resolúvel não geram flush, o que equivale a um
  buffer de destino sempre correto. Motivação: manter o modelo focado nos
  hazards de dados e nos branches condicionais. Impacto: o custo real de um
  salto incondicional é subestimado; documentado em `docs/pipeline-lab.md`.

- **2026-08-08 — Exceções modeladas apenas no fetch.** Com `serializeTraps`, as
  instruções que podem gerar trap bloqueiam o fetch enquanto estão em voo. Não
  há entrada no tratador nem `EPC`. Motivação: descrever o efeito temporal
  sem duplicar a semântica do runtime funcional. Impacto: a opção está inativa
  por omissão e o perfil `strict-traps` isola-a.

- **2026-08-08 — O preditor dinâmico é partilhado com o BHT Simulator.**
  O Pipeline Lab implementa a mesma regra de atualização do
  `tools/bht-simulator.js`: uma previsão errada só inverte a entrada quando todo
  o histórico concorda com o novo resultado. Motivação: duas ferramentas que
  afirmam modelar "uma tabela de histórico de saltos" só são úteis em conjunto
  se modelarem a mesma. Impacto: `tests/pipeline-bht.test.mjs` percorre os dois
  preditores com sequências idênticas e falha perante qualquer divergência —
  uma diferença entre eles é defeito, não variante.

- **2026-08-08 — Diagramas de pipeline não espelham em RTL.**
  Em árabe, a coluna fixa da linha temporal passou a usar `inset-inline-start`
  (fixava-se ao lado errado com `left:0`), mas o datapath e a fila de blocos de
  estágio ficam explicitamente `direction: ltr`. Motivação: a ordem
  IF→ID→EX→MEM→WB é o significado do diagrama; espelhá-la faria o pipeline ler
  ao contrário, e espelhar só um dos dois seria pior que ambos. Impacto: o texto
  dentro dos blocos continua traduzido; as duas vistas concordam sempre.

- **2026-08-08 — Conformidade com o MARS medida, não assumida.**
  `scripts/differential-mars.mjs` monta e executa o mesmo programa nos dois
  simuladores e compara código-máquina, registos, segmento de dados e output.
  O JAR de referência está fixado por SHA-256 e `npm run fetch:mars` recusa
  qualquer outro build. Motivação: "compatível com o MARS" só é afirmável se as
  exceções estiverem escritas. Impacto: 8 de 11 programas são byte-idênticos; as
  3 diferenças restantes são exclusivamente de expansão de pseudo-instruções,
  estão declaradas com justificação e têm caso mínimo em
  `tests/differential/cases/`.

- **2026-08-08 — Divergências intencionais preservadas, não corrigidas.**
  webMARS expande `li` de 32 bits sem destruir `$at` e expande `ble` com
  imediato numa sequência que não pode transbordar, ao contrário do MARS.
  Motivação: ambas as escolhas são melhores que as do MARS e o webMARS é um
  projeto mais completo; alinhar seria uma regressão funcional. Impacto: estão
  na lista de exceções do diferencial, e uma exceção que deixe de se verificar
  faz falhar a suite, para não esconder a próxima regressão real.

- **2026-08-08 — Expansão de `move` alinhada com o template do MARS.**
  Passou de `addu rd, rs, $zero` para `addu rd, $zero, rs`, que é o template
  `addu RG1, $0, RG2` do `PseudoOps.txt` já incluído no repositório. Motivação:
  mesma semântica, mesma contagem de instruções, nenhum registo adicional
  tocado, e torna byte-idêntica a pseudo-instrução mais comum em programas de
  ensino. Impacto: três programas do corpus passaram a idênticos; a suite
  completa manteve-se verde.

- **2026-08-08 — Cobertura medida por V8 em bruto, não por `node --test`.**
  Os módulos da aplicação correm por `vm.runInContext`, pelo que
  `--experimental-test-coverage` não os vê. `scripts/measure-coverage.mjs`
  conduz a suite com `NODE_V8_COVERAGE` e reduz os intervalos de bytes.
  Motivação: sem isto o número publicado seria zero ou enganador. Impacto:
  apenas 5 ficheiros são medidos ao nível de ficheiro; os restantes são
  exercitados por fragmentos de código e ficam listados explicitamente como
  *não medidos* no relatório, nem cobertos nem descobertos.

- **2026-08-08 — Limiares de cobertura são pisos de regressão, não metas.**
  Estão fixados ligeiramente abaixo do valor atual. Motivação: a função é
  falhar quando a cobertura desce. Impacto: sobem quando a cobertura sobe;
  nunca descem para fazer passar uma execução.

- **2026-08-08 — Mutantes escritos à mão, não gerados.**
  `scripts/mutation-test.mjs` aplica edições ancoradas em vez de mutações
  automáticas. Motivação: manter o projeto sem dependências externas e garantir
  que cada mutante representa um defeito que uma pessoa poderia introduzir.
  Impacto: o conjunto é pequeno e não exaustivo — 100% não significa que a
  suite apanhe qualquer falha possível, e isso está declarado no relatório.

- **2026-08-08 — Versionamento do modelo de timing.** O modelo passa a
  identificar-se como `webmars.pipeline-lab` v2 e cada perfil tem versão
  própria, ambas incluídas nos relatórios. Motivação: um relatório antigo tem
  de ser distinguível de um novo quando o timing muda. Impacto: qualquer
  alteração de timing obriga a incrementar a versão do perfil afetado e a
  atualizar `tests/pipeline-lab-microarchitecture.test.mjs`.

- **2026-08-08 — O Pipeline Lab passa a poder reproduzir a execução real.**
  O estágio de fetch tem dois fluxos: o programa montado com a hipótese
  declarada para os saltos (`static`, omissão) e a sequência que o webMARS
  executou de facto (`execution`), registada a partir dos eventos de runtime.
  Motivação: o pedido de "ver os registos ao longo dos ciclos" não é
  satisfazível sem valores, e o modelo não os pode calcular sem passar a ser um
  segundo runtime — o que a secção de âmbito proíbe. Registar o que o runtime
  funcional já produziu dá valores reais e resultados de salto reais sem
  duplicar semântica nenhuma. Impacto: com `execution`, `branches.taken` e
  `mispredicted` descrevem o que aconteceu em vez do que foi assumido, e o
  preditor configurado passa a ser avaliado contra factos. O fluxo escolhido
  fica fora de `config` de propósito, para não transformar um perfil com nome
  em "custom", e aparece em `report.source`.

- **2026-08-08 — Os valores dos registos só existem onde o runtime os deu.**
  No fluxo `static` a vista de registos fica vazia em vez de mostrar zeros, e
  uma instrução do caminho errado nunca escreve nada. Um registo cujo valor
  nunca foi estabelecido aparece como desconhecido, não como 0. Motivação:
  mostrar a um aluno um número que o simulador não produziu é pior do que não
  mostrar número nenhum. Impacto: `tests/pipeline-execution-trace.test.mjs`
  falha se qualquer valor aparecer sem origem no registo da execução.

- **2026-08-08 — Uma descontinuidade no registo ressincroniza o fetch.**
  Um tratador de exceções, código fora do segmento de texto ou um reinício
  produzem uma sequência que nenhum salto do pipeline prevê. Quando o pipeline
  esvazia com instruções por reproduzir, o fetch é colocado sobre a instrução
  registada e o facto é registado como evento `resynchronised`. Motivação: sem
  isto a reprodução ficava bloqueada até esgotar o orçamento de ciclos, o que se
  via como "12/24 passos" e um CPI absurdo. Impacto: o custo aparece como
  ciclos perdidos e é explicado na interface, em vez de ser escondido.

- **2026-08-08 — O pipeline passa a ser desenhado na vertical.**
  Os cinco estágios ficam numa coluna fixa à esquerda, de cima para baixo, com
  o registo de pipeline entre cada par. Motivação: cinco colunas ao longo de uma
  janela só mostram um opcode truncado; cinco linhas mostram a instrução, a
  linha de código e os valores usados — e a vista escolhida (linha temporal,
  registos, datapath) deixa de disputar a mesma largura. Impacto: ao contrário
  do datapath, esta disposição não tem significado esquerda-direita e espelha
  corretamente em RTL. O desenho do datapath continua `direction: ltr`.

- **2026-08-08 — A ferramenta adapta-se à sua própria janela, não ao ecrã.**
  A largura é classificada a partir do callback de `onResize` do shell
  (`narrow` < 560 px, `medium` < 920 px), não de `.desktop-stacked`. Motivação:
  uma janela estreita num monitor grande tem exatamente o mesmo problema que um
  telemóvel, e a classe do desktop não a apanha. Impacto: os grupos de controlo
  fecham-se sozinhos quando não cabem, mas uma escolha explícita do utilizador
  sobrepõe-se sempre ao que a largura decidiria.

- **2026-08-08 — A linha temporal por instrução custava memória quadrática.**
  Cada ciclo guardava no histórico a linha inteira que precedeu a alteração, e
  uma linha cresce uma chave por cada ciclo em que a sua instrução ocupa um
  estágio. No fluxo estático isso nunca se notou — cada instrução é procurada
  uma vez. Reproduzir uma execução visita a mesma instrução milhares de vezes:
  2400 ciclos de um ciclo de quatro instruções custavam 62 MB, e alguns
  milhares mais esgotavam a heap. O histórico passa a guardar a chave a
  remover, não a linha. Impacto: 12 000 instruções reproduzidas em 18 000
  ciclos deixaram de rebentar; fixado em
  `tests/pipeline-execution-trace.test.mjs`, que também verifica que recuar
  reconstrói a linha exatamente como avançar a construiu.

- **2026-08-08 — A cobertura de uma ferramenta mede a metade que os testes
  alcançam.** Um ficheiro de `tools/` tem duas metades: o modelo puro, que os
  testes percorrem por `vm.runInContext`, e a interface, que está atrás de
  `typeof document === "undefined"` e retorna antes de executar. A medição passa
  a parar nessa linha. Motivação: contar linhas que nenhum teste Node pode
  alcançar não media uma falha de testes — só fazia a percentagem descer sempre
  que a interface crescia, e foi o que aconteceu quando o `pipeline-lab.js`
  passou de 1979 para 3308 linhas e caiu de 46% para 38% sem que um único teste
  piorasse. Impacto: os pisos **subiram** para 85/71/86, que é o valor real
  sobre a metade alcançável, e a regra de nunca baixar um piso mantém-se
  intacta. A metade da interface fica declarada como *não medida*, ao lado dos
  módulos que já o estavam.

- **2026-08-08 — A versão é escrita por um comando, não por onze edições.**
  `npm run version:set -- X.Y.Z` escreve a versão nos onze sítios que a
  declaram e `--check` verifica-os sem escrever. Motivação: o browser não
  consegue ler o `package.json`, pelo que `app-version.js` não pode importá-lo
  e a duplicação não se elimina; o que se elimina é o erro humano de a repetir
  à mão, que `tests/release-readiness.test.mjs` apenas *detetava*. Impacto: as
  páginas de ajuda que afirmam a versão passaram a usar o token
  `__WEBMARS_APP_VERSION__`, substituído em runtime, e os cabeçalhos históricos
  do changelog ficam intocados de propósito — `0.5.4 — MARS-OS desktop` é um
  registo do que saiu, não uma afirmação sobre esta build.

- **2026-08-08 — Cortar o changelog é um comando, com uma exceção.**
  `npm run changelog:cut -- X.Y.Z` transforma a secção por publicar numa versão
  numerada nos vinte idiomas e traduz apenas as entradas novas. Espanhol e
  português são reestruturados mas o texto novo fica em inglês e é reportado,
  em vez de traduzido à máquina para dentro de um catálogo revisto à mão — a
  primeira execução, antes desta regra, produziu "el oleoducto sigue el
  programa" para *the pipeline follows the program*, o que é exatamente o que a
  regra existe para impedir.

- **2026-08-08 — Foco pedido pelo utilizador e foco causado pela execução.**
  Em modo empilhado só há um painel visível, pelo que focar uma janela é
  substituir o que o utilizador estava a ler. Todos os comandos de execução
  focavam os segmentos de texto e dados, e `setMode` — que todos eles chamam —
  focava a janela principal, pelo que cada *Passo* atirava o leitor de volta
  para o segmento de dados. Passou a haver `focusForExecution`, que no desktop
  é igual a `focus` e em empilhado não troca de painel. Abrir uma janela, nova
  ou já aberta, continua a dar-lhe foco, e os botões de modo continuam a contar
  como intenção explícita. Impacto: fixado em
  `tests/window-focus-regression.test.mjs`, incluindo a contagem dos pontos de
  chamada, para que um comando novo tenha de escolher deliberadamente.

- **2026-08-08 — Seguir um passo é a instrução *entrar* no pipeline, não sair.**
  A regra de seguimento parava no ciclo em que a instrução mais recente escrevia
  o resultado. Como um registo de execução só contém instruções já executadas,
  não havia nada a seguir para procurar: todos os estágios mais novos ficavam
  vazios e o pipeline esvaziava-se e voltava a encher-se a cada passo, mostrando
  apenas o último estágio. Passou a parar no ciclo em que a instrução entra em
  IF, com as anteriores espalhadas pelos estágios seguintes. Impacto: cinco
  passos enchem os cinco estágios; fixado em
  `tests/pipeline-execution-trace.test.mjs` com a ocupação esperada
  `[1,2,3,4,5,5]`, que o comportamento antigo daria como `[1,1,1,1,1,1]`.

- **2026-08-08 — A coordenada de procura é canónica nos dois sentidos.**
  Um contador mantém o mesmo valor durante vários ciclos — nada é procurado
  durante um stall — pelo que "o ciclo em que N instruções entraram" nomeia um
  intervalo, não um ciclo. Chegar pela esquerda parava no primeiro e pela
  direita no último, e *seguinte* seguido de *anterior* assentava um ciclo ao
  lado. O primeiro ciclo do intervalo passou a ser o canónico. Impacto:
  7→4→3→4→7 devolve exatamente o mesmo estado; `seekCounter` é partilhada pelas
  três coordenadas (entradas registadas, entradas totais, escritas concluídas).

- **2026-08-08 — A diferença entre as duas vistas de registos é mostrada.**
  Depois de N passos o pipeline tem até quatro instruções em voo, pelo que a
  vista de registos da ferramenta está legitimamente atrás da janela de Registos
  do webMARS. O mostrador indica quantas estão em voo e a vista diz de quantas
  está atrasada. Motivação: sem isto a diferença lê-se como uma
  dessincronização, quando é exatamente o que um pipeline faz.

- **2026-08-08 — Um transporte para os dois relógios.** O Pipeline Lab passa a
  ter *Passo anterior* e *Passo seguinte* além de *Ciclo anterior* e *Ciclo
  seguinte*; no fim do registo os controlos de passo conduzem o próprio
  webMARS através de `ctx.runtimeControls`. Motivação: uma ferramenta que só
  espera que alguém carregue em *Passo* na janela principal não integra nada, e
  a unidade em que um aluno pensa ("a instrução seguinte") não era navegável.
  Impacto: o ponto de chegada de um passo é o ciclo em que a instrução escreve
  o resultado — o único em que o banco de registos do modelo e o do runtime têm
  os mesmos valores — e `seekRetired` torna isso uma coordenada partilhada,
  verificada em `tests/pipeline-execution-trace.test.mjs`.

- **2026-08-08 — `onBackstep` era entregue por um canal que a ferramenta não
  ouvia.** O runtime entrega o passo atrás por `toolManager.onBackstep`, não
  pelo fluxo de eventos; o Pipeline Lab só implementava `onRuntimeEvent`, pelo
  que continuava a reproduzir instruções já desfeitas. Motivação/impacto:
  defeito corrigido — todas as outras ferramentas já implementavam
  `onBackstep`, e esta passou a fazê-lo.

- **2026-08-08 — <kbd>F8</kbd> para Passo atrás.** O passo tinha atalho
  (<kbd>F7</kbd>) e o passo atrás não, o que obrigava a ir ao rato assim que se
  passava uma instrução do ponto pretendido. F8 é a tecla que o MARS usa.
  Impacto: acrescentado ao menu Executar e à tabela de atalhos das 20 versões da
  ajuda.

- **2026-08-08 — Tradução dirigida em vez de regeneração.**
  `scripts/translate-new-keys.mjs` traduz apenas as entradas que um catálogo
  gerado ainda responde em inglês e substitui-as no ficheiro existente, sem
  tocar em mais nenhuma linha; `en`, `es` e `pt` nunca são tocados. Motivação:
  `generate-locales.mjs` reescreve tudo e volta a traduzir entradas já
  corrigidas à mão, pelo que uma funcionalidade que acrescenta dez chaves podia
  degradar milhares. Impacto: 753 entradas traduzidas em 17 idiomas numa
  passagem; uma tradução que altere um `{placeholder}` é recusada e a entrada
  fica em inglês, e quatro fizeram-no (`bn`, `ur`). Documentado em
  [docs/localization.md](docs/localization.md).

- **2026-08-08 — Paridade de idiomas medida, não declarada.**
  `tests/localization-parity.test.mjs` conta, por idioma, as entradas ainda
  respondidas em inglês e compara com um teto. Motivação: ter todas as chaves em
  todos os catálogos — que já era testado — não impede que metade delas
  responda em inglês. Impacto: os tetos são pisos de regressão como os da
  cobertura; descem quando o trabalho é feito e nunca sobem. Nenhum é zero, e
  isso é correto: `forwarding`, `delay slot`, `heap` e os nomes das ferramentas
  ficam em inglês de propósito.

- **2026-08-08 — O que precisa de pessoas fica preparado, não fingido.**
  [docs/validation-plan.md](docs/validation-plan.md) define as perguntas de
  investigação, as tarefas medidas, os instrumentos, o consentimento e as
  limitações a declarar, para a validação da API por terceiros, o estudo de
  usabilidade, a auditoria WCAG AA e a matriz de portabilidade. Motivação: as
  perguntas de investigação têm de existir antes dos dados, ou os dados
  escolhem-nas. Impacto: nada disto foi executado e o documento diz isso em
  cada secção; enquanto assim for, nenhuma conclusão dessas secções é citável.
