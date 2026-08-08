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

- [ ] Criar `docs/comparison-matrix.md`.
- [ ] Inventariar todas as instruções MIPS32 suportadas.
- [ ] Inventariar pseudo-instruções e formatos aceites pelo assembler.
- [ ] Inventariar diretivas, macros, syscalls, exceções e dispositivos MMIO.
- [ ] Classificar cada capacidade como `completa`, `parcial`, `extensão webMARS`
      ou `não suportada`.
- [ ] Documentar diferenças conhecidas relativamente ao MARS 4.5.
- [ ] Documentar diferenças relativamente ao modelo de Patterson e Hennessy.
- [ ] Ligar cada linha da matriz aos testes ou exemplos que a demonstram.

### Evidência e publicação

- [ ] Adicionar `CITATION.cff` com autores, versão, licença e URL do projeto.
- [ ] Criar uma página pública "Comparison and Evidence".
- [ ] Publicar limitações conhecidas sem linguagem ambígua.
- [ ] Definir um formato estável para relatórios de compatibilidade.
- [ ] Produzir screenshots e vídeos versionados das funcionalidades principais.
- [ ] Preparar uma release arquivável no Zenodo ou serviço equivalente.
- [ ] Atribuir DOI a uma release de referência, quando o projeto estiver pronto.
- [ ] Disponibilizar um resumo técnico adequado a artigos e trabalhos académicos.
- [ ] Nomear sempre os critérios de comparação; evitar colunas opacas como A/B/C/D.

### Critérios de aceitação de P0

- [ ] Um leitor externo consegue verificar uma afirmação sem consultar o autor.
- [ ] A matriz distingue claramente comportamento funcional e timing arquitetural.
- [ ] A documentação identifica a versão exata a que cada resultado corresponde.
- [ ] Não existem afirmações de compatibilidade sem evidência associada.

## P1 - Pipeline Lab

O Pipeline Lab será a principal nova capacidade pedagógica da v0.6.0. Deve ser
um modelo isolado do runtime funcional, com configuração, estado e resultados
próprios, reutilizando o assembler e as representações de instruções sempre que
isso não introduzir dependências incorretas.

### Modelo base

- [x] Definir formalmente o pipeline de cinco estágios: IF, ID, EX, MEM e WB.
- [x] Definir o estado de cada estágio e de cada registo de pipeline por ciclo.
- [ ] Modelar bubbles, stalls, flushes e conclusão de instruções.
- [ ] Modelar hazards estruturais, de dados e de controlo.
- [x] Modelar forwarding configurável.
- [ ] Modelar delay slots configuráveis.
- [ ] Modelar resolução e penalização de branches.
- [ ] Definir o comportamento de exceções no pipeline.
- [ ] Definir claramente instruções não suportadas pelo modelo cycle-accurate.
- [x] Garantir resultados determinísticos para a mesma configuração e programa.

### Configurações arquiteturais

- [x] Pipeline simples sem forwarding.
- [x] Pipeline com forwarding.
- [ ] Pipeline com e sem delay slot.
- [ ] Previsão estática always-not-taken.
- [ ] Previsão estática always-taken.
- [ ] Integração opcional com o Branch History Table Simulator.
- [ ] Latência configurável da memória.
- [ ] Perfis predefinidos e identificados por versão.
- [ ] Comparação lado a lado entre duas configurações.

### Vista "Aprender"

- [x] Mostrar os cinco estágios como blocos simples e legíveis.
- [x] Mostrar uma linha temporal instrução/ciclo.
- [ ] Sincronizar código-fonte, instrução montada e estágio atual.
- [ ] Explicar a causa de cada stall, bubble ou flush.
- [ ] Destacar dependências entre instruções.
- [ ] Mostrar caminhos de forwarding com linguagem acessível.
- [ ] Disponibilizar tooltips e explicações contextuais.
- [x] Permitir avançar e recuar um ciclo.
- [ ] Permitir selecionar uma instrução e seguir todo o seu percurso.

### Vista "Arquitetura"

- [ ] Desenhar o datapath completo do pipeline.
- [ ] Mostrar registos de pipeline e sinais de controlo.
- [ ] Mostrar multiplexadores e caminhos selecionados no ciclo atual.
- [ ] Mostrar valores de entrada e saída dos componentes relevantes.
- [ ] Mostrar caminhos de forwarding e deteção de hazards.
- [ ] Permitir ocultar grupos de sinais para reduzir ruído visual.
- [ ] Manter a seleção sincronizada com a vista "Aprender".

### Métricas e exportação

- [x] Contabilizar ciclos, instruções concluídas e CPI.
- [ ] Contabilizar stalls, bubbles, flushes e hazards por tipo.
- [ ] Contabilizar branches, previsões e falhas de previsão.
- [ ] Comparar automaticamente duas configurações.
- [ ] Exportar resultados em JSON e CSV.
- [ ] Exportar uma linha temporal reproduzível da execução.
- [ ] Incluir versão do webMARS, perfil e hash do programa em cada relatório.

### Correção do Pipeline Lab

- [ ] Criar testes por instrução e por sequência de dependências.
- [ ] Criar testes específicos para todos os tipos de hazard.
- [ ] Criar testes de forwarding e stalls esperados por ciclo.
- [ ] Criar programas de referência com diagramas temporais aprovados.
- [ ] Comparar resultados com exemplos publicados de Patterson e Hennessy.
- [ ] Testar importação/exportação e backstep por ciclo.
- [ ] Separar explicitamente testes funcionais da ISA e testes de microarquitetura.

## P2 - Pacote pedagógico

### Laboratórios guiados

- [ ] Criar uma sequência introdutória sobre os cinco estágios.
- [ ] Criar um laboratório de hazards de dados.
- [ ] Criar um laboratório de forwarding.
- [ ] Criar um laboratório de branches e flushes.
- [ ] Criar um laboratório de previsão de branches.
- [ ] Criar um laboratório de CPI e otimização de código.
- [ ] Criar um laboratório de memória e cache.
- [ ] Incluir objetivos, pré-requisitos, passos e perguntas de reflexão.
- [ ] Permitir que o aluno preveja o resultado antes de executar.
- [ ] Comparar a previsão do aluno com a execução real.

### Apoio a docentes

- [ ] Criar um guia de adoção para docentes.
- [ ] Criar fichas de laboratório imprimíveis.
- [ ] Criar soluções separadas das fichas dos alunos.
- [ ] Criar conjuntos de programas com dificuldade progressiva.
- [ ] Permitir exportar resultados anónimos para avaliação.
- [ ] Documentar formas de usar o webMARS em aulas e demonstrações.
- [ ] Preparar uma apresentação curta sobre o Pipeline Lab.

### Critérios de aceitação de P2

- [ ] Um docente consegue realizar um laboratório sem assistência do autor.
- [ ] Um aluno consegue explicar a causa de um stall depois do laboratório.
- [ ] Todos os materiais indicam versão, duração e conhecimentos prévios.
- [ ] Os exemplos são validados automaticamente pela suite de testes.

## P3 - Correção, cobertura e desempenho

### Compatibilidade e testes diferenciais

- [ ] Criar uma suite automática webMARS versus MARS 4.5.
- [ ] Comparar montagem, diagnósticos, memória, registos e output final.
- [ ] Definir regras para diferenças intencionais.
- [ ] Guardar casos mínimos para cada regressão encontrada.
- [ ] Publicar um resumo da conformidade por release.

### Cobertura e robustez

- [ ] Medir statement, branch e function coverage do JavaScript.
- [ ] Definir limiares mínimos para os módulos críticos.
- [ ] Introduzir mutation testing no assembler e runtime.
- [ ] Medir a capacidade dos testes para detetar mutações relevantes.
- [ ] Adicionar fuzzing limitado ao parser, assembler e importação de estado.
- [ ] Testar projetos grandes, programas longos e estados de memória extremos.
- [ ] Publicar resultados sem confundir quantidade de testes com cobertura real.

### Benchmark oficial

- [ ] Definir programas representativos e respetivos objetivos.
- [ ] Medir compilação Mini-C, montagem, execução e ferramentas conectadas.
- [ ] Definir warm-up, número de repetições e tratamento de outliers.
- [ ] Registar browser, sistema operativo, CPU, memória e versão.
- [ ] Automatizar benchmarks em pelo menos Chrome e Firefox.
- [ ] Publicar medianas, dispersão e tamanho das amostras.
- [ ] Guardar resultados históricos para detetar regressões.
- [ ] Permitir executar localmente o mesmo protocolo publicado.

## P4 - Modularidade e extensibilidade

### API para ferramentas

- [ ] Documentar o ciclo de vida de uma ferramenta.
- [ ] Documentar snapshots, eventos, deltas e histórico central.
- [ ] Definir contratos estáveis para leitura e escrita de memória/MMIO.
- [ ] Definir contratos de tradução e atualização de idioma.
- [ ] Definir contratos para janelas, mobile e acessibilidade.
- [ ] Versionar a API pública das ferramentas.
- [ ] Criar uma ferramenta mínima de exemplo.
- [ ] Criar um template de ferramenta completa com testes.
- [ ] Impedir que uma ferramenta com falhas interrompa o runtime.

### Documentação de programador

- [ ] Atualizar os diagramas da arquitetura do código.
- [ ] Explicar as fronteiras entre assembler, runtime, UI, armazenamento e tools.
- [ ] Criar um guia "primeira contribuição".
- [ ] Criar um guia para adicionar instruções e pseudo-instruções.
- [ ] Criar um guia para adicionar syscalls e dispositivos MMIO.
- [ ] Documentar invariantes de memória, snapshots e backstep.
- [ ] Documentar o processo de release e compatibilidade entre versões.

### Validação por terceiros

- [ ] Pedir a pelo menos dois contribuidores externos que criem uma ferramenta.
- [ ] Registar tempo, dúvidas, erros e alterações necessárias no core.
- [ ] Pedir a implementação de uma extensão simples de arquitetura.
- [ ] Rever a API e documentação a partir dos resultados.
- [ ] Publicar um relatório anónimo da experiência.

## P5 - Usabilidade, acessibilidade e portabilidade

### Estudo de usabilidade

- [ ] Definir perguntas de investigação antes de recolher dados.
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
- [ ] Garantir navegação integral por teclado.
- [ ] Definir ordem de foco previsível nas janelas e ferramentas.
- [ ] Validar nomes acessíveis e anúncios para leitores de ecrã.
- [ ] Não depender apenas da cor para identificar estágios ou hazards.
- [ ] Disponibilizar paleta adequada a diferentes formas de daltonismo.
- [ ] Validar contraste nos temas claro e escuro.
- [ ] Suportar redução de movimento.
- [ ] Testar zoom elevado e tamanhos de letra maiores.
- [ ] Publicar uma declaração de acessibilidade e limitações conhecidas.

### Portabilidade

- [ ] Testar Chrome, Firefox, Edge e Safari nas versões suportadas.
- [ ] Testar Windows, Linux e macOS.
- [ ] Testar Android e iOS em tamanhos representativos.
- [ ] Criar uma matriz pública browser/plataforma/funcionalidade.
- [ ] Avaliar modo offline/PWA sem comprometer atualização e segurança.
- [ ] Garantir que relatórios exportados funcionam sem backend.

### Localização

- [ ] Garantir paridade completa entre todos os idiomas suportados.
- [ ] Rever terminologia de arquitetura com falantes tecnicamente competentes.
- [ ] Validar RTL no Pipeline Lab, gráficos e relatórios.
- [ ] Garantir que diagramas não contêm texto fixo não traduzível.
- [ ] Incluir idioma e versão nos materiais pedagógicos exportados.

## Entregáveis da v0.6.0

- [ ] Pipeline Lab funcional com vista "Aprender" e vista "Arquitetura".
- [ ] Pelo menos quatro configurações arquiteturais comparáveis.
- [ ] Métricas e exportação JSON/CSV reproduzíveis.
- [ ] Matriz pública de compatibilidade e limitações.
- [ ] Suite diferencial com MARS 4.5.
- [ ] Relatório de cobertura e benchmark oficial.
- [ ] Primeiro conjunto de laboratórios para alunos e docentes.
- [ ] API de ferramentas documentada e versionada.
- [ ] Documentação de programador atualizada.
- [ ] Auditoria inicial de acessibilidade.
- [ ] Matriz de portabilidade entre browsers e plataformas.
- [ ] `CITATION.cff` e pacote de evidências da release.
- [ ] Changelog e documentação atualizados em todos os idiomas suportados.

## Definição de concluído

A v0.6.0 só deverá ser publicada quando:

- [ ] todos os testes automáticos passarem;
- [ ] o build e o pacote de release forem reproduzíveis;
- [ ] não existirem regressões conhecidas de alta severidade;
- [ ] as capacidades novas tiverem documentação de utilizador e programador;
- [ ] os resultados publicados puderem ser reproduzidos por terceiros;
- [ ] o Pipeline Lab declarar claramente o perfil arquitetural utilizado;
- [ ] o runtime funcional continuar compatível com os projetos existentes;
- [ ] desktop e mobile tiverem sido verificados visualmente;
- [ ] os idiomas suportados tiverem paridade estrutural e funcional;
- [ ] limitações, metodologia e tamanho das amostras estiverem explícitos;
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

- Nenhuma decisão registada.
