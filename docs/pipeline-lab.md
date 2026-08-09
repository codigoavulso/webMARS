# Pipeline Lab

O Pipeline Lab é um simulador de ciclos separado do runtime funcional do
webMARS. Reutiliza as instruções produzidas pelo assembler, mas não altera o
estado, o PC, os registos nem a memória da execução normal.

O modelo identifica-se como `webmars.pipeline-lab` v2. Este identificador e a
versão do perfil aparecem em todos os relatórios exportados; qualquer alteração
de timing obriga a incrementar a versão do perfil afetado.

## Os dois relógios

A ferramenta tem dois contadores que nunca devem ser confundidos:

| Contador | Significado |
| --- | --- |
| **Ciclo de pipeline** | Um ciclo de relógio da microarquitetura modelada. |
| **Passo webMARS** | Uma instrução completa do runtime funcional. |

O runtime funcional executa uma instrução por passo e não é cycle-accurate; o
modelo de pipeline conta ciclos e não executa nada. A barra superior mostra
sempre os dois lado a lado, e a linha temporal identifica cada instrução pelo
passo webMARS que a produziu (`#7`).

## Fluxo de instruções

O estágio de fetch pode ler dois fluxos diferentes, escolhidos em **Fluxo de
instruções**:

| Fluxo | Origem | Saltos | Valores |
| --- | --- | --- | --- |
| `static` (omissão) | Programa montado, por ordem de endereço. | Hipótese declarada (`outcomeModel`). | Nenhum: nada é executado. |
| `execution` | A sequência que o webMARS executou, registada instrução a instrução. | Resultado real de cada salto. | Os valores que cada instrução leu e escreveu. |

Com **Seguir o programa em execução** ativo, cada passo ou execução no webMARS
estende o registo e o pipeline volta a reproduzi-lo do ciclo 0. A reprodução
recomeça sempre do princípio porque um pipeline não pode ser prolongado a meio
sem voltar a decidir todas as previsões seguintes; para não pagar isso a cada
instrução de uma execução rápida, as reproduções são agrupadas por frame.

O registo é limitado a 20 000 instruções e é descartado quando o programa é
remontado ou reiniciado — juntar duas execuções distintas num só fluxo faria o
modelo ter de explicar um salto que nunca existiu.

### O que a reprodução muda

- **Os saltos deixam de ser hipóteses.** `branches.taken`, `notTaken`,
  `predicted` e `mispredicted` passam a descrever o que aconteceu, e o preditor
  configurado é avaliado contra o resultado real.
- **As instruções do caminho errado continuam a ser procuradas.** O hardware
  procura-as e depois descarta-as; no modelo aparecem na linha temporal marcadas
  como anuladas, sem passo webMARS e sem escrever nada.
- **Uma descontinuidade que nenhum salto prevê ressincroniza o fetch.** Um
  tratador de exceções, código fora do segmento de texto ou um reinício geram um
  evento `resynchronised` em vez de bloquear a reprodução.
- **O que o registo não viu não é inventado.** Uma execução que termina a meio
  deixa o último salto por resolver, e esse salto não entra em nenhuma
  estatística de previsão.

## Registos ao longo dos ciclos

Só a reprodução tem valores; no fluxo `static` a vista de registos fica
deliberadamente vazia em vez de mostrar zeros.

Uma escrita chega ao banco de registos quando a instrução entra em **WB**, e é
exatamente por isso que as opções de forwarding importam. A vista **Registos**
mostra as duas coisas ao mesmo tempo:

- **Banco de registos** — o valor atual, o ciclo e o passo webMARS que o
  escreveram, e o valor que está *ainda por escrever* num estágio anterior. Esse
  segundo valor é precisamente o que um caminho de forwarding transporta.
- **Valores ao longo dos ciclos** — uma grelha com a mesma janela de ciclos da
  linha temporal das instruções: uma linha por registo, uma coluna por ciclo, e
  o novo valor na coluna do ciclo que o confirmou.

`snapshot.registers`, `snapshot.registerLog` e a secção `registers` do relatório
expõem os mesmos dados; **Export CSV** acrescenta uma terceira folha com uma
linha por escrita confirmada.

## Modelo de cinco estágios

O modelo é determinístico, single-issue e in-order.

| Estágio | Significado |
| --- | --- |
| IF | Entrada da instrução seguinte do fluxo de fetch previsto. |
| ID | Descodificação e leitura lógica dos operandos. |
| EX | Operação da ALU, cálculo de endereço e (por omissão) resolução de branches. |
| MEM | Acesso lógico à memória, com latência configurável. |
| WB | Conclusão da instrução e escrita lógica do resultado. |

Cada estágio contém uma instrução, uma bolha identificada ou está vazio. Os
registos de pipeline são representados pela transição do conteúdo entre os
estágios no fim de cada ciclo. A instrução é contabilizada como concluída
quando entra em WB. O CPI mostrado é `ciclos / instruções concluídas`.

## Configuração

| Opção | Valores | Omissão |
| --- | --- | --- |
| `forwarding` | ativo / inativo | inativo |
| `delaySlot` | ativo / inativo | inativo |
| `branchPrediction` | `not-taken`, `taken`, `bht` | `not-taken` |
| `bhtEntries` | 8, 16, 32 | 16 |
| `bhtHistorySize` | 1, 2 | 1 |
| `bhtInitialTaken` | ativo / inativo | inativo |
| `branchResolution` | `ID`, `EX` | `EX` |
| `memoryLatency` | 1 a 8 ciclos | 1 |
| `outcomeModel` | `sequential`, `backward-taken` | `sequential` |
| `loopIterations` | 1 a 64 | 4 |
| `serializeTraps` | ativo / inativo | inativo |

Alterar qualquer opção reinicia a simulação, garantindo que uma linha temporal
nunca mistura duas configurações.

### Perfis predefinidos

Cada perfil tem identificador e versão próprios: `stall-only`, `forwarding`,
`delay-slot`, `predict-taken`, `early-resolution`, `slow-memory`,
`strict-traps` e `bht-dynamic`. O botão **Compare profiles** executa o mesmo
programa em todos eles e apresenta ciclos, CPI, stalls, instruções anuladas e
saltos mal previstos lado a lado.

## Hazards

### Dados

O modelo deteta dependências RAW entre os registos lidos pela instrução em ID e
os registos escritos por instruções anteriores.

- Sem forwarding, a instrução fica em ID enquanto o produtor estiver em EX ou
  MEM. O valor escrito em WB pode ser lido no mesmo ciclo.
- Com forwarding, as dependências de resultados ALU não param o pipeline. Uma
  dependência load-use com o load em EX introduz exatamente uma bolha.
- `$zero` nunca é tratado como destino de uma dependência.

Durante um stall, IF e ID mantêm o seu conteúdo e entra uma bolha em EX. A linha
temporal marca o ciclo retido em ID como `ID*`.

### Estruturais

Com `memoryLatency` maior que 1, uma instrução de acesso à memória ocupa o
estágio MEM durante N ciclos. Enquanto o porto de memória estiver ocupado,
nenhum estágio anterior avança e WB recebe uma bolha `structural`.

### Controlo

Uma instrução de controlo resolve-se ao sair do estágio indicado por
`branchResolution`. Se o caminho previsto no fetch não corresponder ao resultado
assumido, as instruções mais novas são anuladas e o fetch retoma no índice
correto:

| Resolução | Sem delay slot | Com delay slot |
| --- | --- | --- |
| `EX` | 2 instruções anuladas | 1 instrução anulada |
| `ID` | 1 instrução anulada | 0 instruções anuladas |

### Previsão dinâmica

Com `branchPrediction: "bht"`, o modelo usa uma tabela de histórico de saltos
indexada por `(endereço >>> 2) % bhtEntries`. Uma previsão errada só inverte a
entrada quando todo o histórico concorda com o novo resultado, pelo que uma
surpresa isolada não derruba um padrão estabelecido.

Esta é exatamente a regra implementada pelo **BHT Simulator**
(`tools/bht-simulator.js`), e não uma variante: `tests/pipeline-bht.test.mjs`
percorre os dois preditores com sequências de resultados idênticas e falha
perante qualquer divergência. Uma configuração pode ser transportada de uma
ferramenta para a outra sem tradução.

O estado da tabela aparece em `snapshot.branchTable` quando o modo está ativo, e
é restaurado exatamente pelo retrocesso.

Saltos incondicionais com destino resolúvel são previstos corretamente no fetch,
pelo que não geram flush; equivalem a um modelo com buffer de destino sempre
correto. `jr` e `jalr` têm destino desconhecido e são contabilizados em
`branches.indirect`.

### Exceções

O modelo não executa o tratador de exceções. Com `serializeTraps` ativo, as
instruções que podem gerar trap (`syscall`, `break`, família `t*`, `eret`)
bloqueiam o fetch enquanto estiverem em voo; os ciclos correspondentes são
contabilizados em `exceptionStalls`. Com a opção inativa, atravessam o pipeline
como qualquer outra instrução.

## Resultado assumido dos branches

O Pipeline Lab não executa o programa, pelo que o resultado real de um branch é
desconhecido. O modelo declara explicitamente a hipótese usada:

- `sequential` (omissão): todos os branches condicionais caem para a instrução
  seguinte. O fluxo é uma trajetória linear e termina sempre.
- `backward-taken`: um branch para trás é tomado até `loopIterations` vezes e
  depois cai. Modela um ciclo com número de iterações conhecido e garante
  terminação.

A hipótese em vigor é indicada na própria ferramenta e em cada relatório.

## Instruções sem modelo de timing

Instruções de vírgula flutuante e de coprocessador (`add.s`, `mfc1`, `bc1t`,
`cvt.*`, entre outras) atravessam os cinco estágios com latência unitária, o que
não corresponde ao hardware. São listadas em `program.unmodelled` em todos os
relatórios e o seu número é apresentado na ferramenta.

## Métricas

`cycles`, `completed`, `cpi`, `stalls`, `dataStalls`, `structuralStalls`,
`exceptionStalls`, `bubbles`, `flushes`, `hazards` por tipo (`raw`, `load-use`,
`structural`, `control`) e `branches` (`total`, `taken`, `notTaken`,
`predicted`, `mispredicted`, `indirect`).

Cada stall, flush ou trap gera um evento com ciclo, tipo, causa, instrução
envolvida e registos em conflito, usado para explicar o motivo na interface.

## Exportação

- **Export JSON** produz um relatório com o esquema `webmars.pipeline-report/1`,
  contendo modelo e versão, versão do webMARS, perfil e versão do perfil,
  configuração completa, hash FNV-1a do programa, métricas, linha temporal por
  instrução e a lista de eventos.
- **Export CSV** produz duas folhas: a linha temporal (uma linha por instrução
  executada, uma coluna por ciclo) e o resumo de métricas e configuração.

Os relatórios não incluem data nem qualquer valor não determinístico: o mesmo
programa com a mesma configuração produz exatamente o mesmo ficheiro.

## Apresentação

A janela divide-se em duas colunas. À esquerda, fixa, está o **pipeline neste
momento**: os cinco estágios de cima para baixo, com o registo de pipeline que
separa cada par desenhado entre eles, e o resumo de métricas por baixo. À
direita fica a vista escolhida.

O pipeline é vertical e não horizontal por uma razão prática: cinco colunas ao
longo de uma janela só conseguem mostrar um opcode truncado, enquanto cinco
linhas conseguem mostrar a instrução, a linha de código que lhe deu origem e os
valores que usou. Ao contrário do desenho do datapath, esta disposição não
carrega nenhum significado esquerda-direita, pelo que espelha corretamente em
RTL.

A ferramenta adapta-se à largura da **sua própria janela**, não à do ecrã: uma
janela estreita num monitor grande recebe o mesmo tratamento que um telemóvel.
Abaixo de 560 px as duas colunas passam a uma só e os grupos de controlo
fecham-se; abaixo de 920 px a coluna do pipeline estreita. Os grupos **Fluxo de
instruções**, **Definições do pipeline** e **Prever e exportar** podem sempre
ser abertos e fechados à mão, e a escolha do utilizador sobrepõe-se ao que a
largura decidiria.

## Vista "Arquitetura"

A ferramenta tem três vistas comutáveis. A vista **Aprender** mostra a
explicação do ciclo atual e a linha temporal instrução/ciclo; a vista
**Registos** está descrita acima. A vista **Arquitetura** desenha o datapath
esquemático:

- os quatro registos de pipeline (IF/ID, ID/EX, EX/MEM, MEM/WB) com o conteúdo
  do ciclo atual, a tracejado quando contêm uma bolha;
- PC, memória de instruções, banco de registos, extensão de sinal, unidade de
  controlo, ALU, memória de dados e o caminho de escrita do resultado;
- multiplexadores destacados quando o estágio correspondente está ocupado;
- os sinais de controlo `RegWrite`, `MemRead`, `MemWrite`, `MemToReg`,
  `ALUSrc`, `RegDst` e `Branch`, derivados da instrução em EX;
- os caminhos de forwarding ativos, com o registo de pipeline de origem
  identificado em linguagem corrente;
- a unidade de deteção de hazards, destacada quando retém IF e ID.

Os grupos **Sinais de controlo**, **Caminhos de forwarding**, **Deteção de
hazards** e **Nomes dos operandos** podem ser ocultados individualmente. A
instrução selecionada na linha temporal continua destacada nesta vista,
qualquer que seja o estágio onde se encontre.

O modelo não calcula valores, pelo que os componentes mostram nomes de
operandos, não conteúdos. Todo o texto do diagrama passa pelo catálogo de
traduções.

## Previsão do aluno

A caixa **Ciclos previstos** e o botão **Verificar previsão** permitem
comprometer-se com um número antes de executar. A ferramenta corre o programa
até ao fim e indica o valor real e a diferença. Os laboratórios em
[labs/](labs/) usam este fluxo em todas as fichas.

## Controlo e reprodução

O transporte fala as duas unidades:

| Botão | Move | No fim do registo |
| --- | --- | --- |
| **Ciclo anterior / Ciclo seguinte** | Um ciclo de pipeline. | *Ciclo seguinte* pede uma instrução ao webMARS. |
| **Passo anterior / Passo seguinte** | Até ao ciclo em que a instrução webMARS anterior/seguinte **entra** no pipeline. | *Passo seguinte* executa mais uma instrução no webMARS; *Passo anterior*, no início, desfaz uma. |

**Uma instrução executada no webMARS é uma instrução a entrar no pipeline.** É
esta a ligação entre os dois, e vale nos dois sentidos: **Passo** / **Passo
atrás** no webMARS (<kbd>F7</kbd> / <kbd>F8</kbd>) estendem ou encurtam o
registo e o pipeline acompanha; *Passo seguinte* e *Ciclo seguinte* na
ferramenta executam uma instrução no webMARS quando o estágio de fetch não tem
o que ir buscar.

O ponto de chegada é o ciclo em que a instrução entra em IF — **não** aquele em
que escreve o resultado. A diferença não é cosmética: um registo só contém
instruções que já executaram, pelo que parar na escrita do resultado deixaria
todos os estágios mais novos vazios e o pipeline esvaziava-se e voltava a
encher-se a cada passo, em vez de correr. Parar na entrada põe a instrução nova
em IF com as anteriores espalhadas pelos estágios seguintes — que é o aspeto de
um pipeline.

Com **Seguir o programa em execução** desligado, o registo continua a ser
recolhido mas a posição de leitura fica onde estava.

### Porque é que as duas vistas de registos diferem

Depois de N passos, o webMARS terminou N instruções mas o pipeline ainda tem
algumas em voo — no máximo quatro, a profundidade entre IF e WB. A janela de
**Registos** do webMARS mostra o estado depois das N; a vista de registos da
ferramenta mostra o que já foi escrito em WB, e fica atrás exatamente pelas que
estão em voo.

Isto não é uma dessincronização: é o que um pipeline faz. O mostrador indica-o
sempre (`ciclo 11 · passo webMARS 7 · 3 em voo`) e a vista de registos diz de
quantas instruções está atrasada. Quando o pipeline esvazia — com **Executar
pipeline** — o número de instruções em voo é zero e as duas vistas coincidem
exatamente.

É possível avançar um ciclo, recuar para o estado exato anterior, reiniciar ou
executar até o pipeline esvaziar. O histórico inclui estágios, próximo índice,
métricas, eventos, contadores de ciclo e linha temporal, pelo que o retrocesso é
determinístico. Para programas grandes, o histórico guarda apenas as linhas
alteradas em cada ciclo e a interface mostra uma janela móvel de até 160
instruções e 80 ciclos.

Selecionar uma linha da linha temporal fixa a instrução: a ferramenta mostra o
percurso completo ciclo a ciclo e destaca as instruções que produzem os seus
operandos.

## Exemplos de referência

Para três instruções, em que a segunda lê o resultado ALU da primeira:

```mips
add $t0, $t1, $t2
sub $t3, $t0, $t4
or  $t5, $t6, $t7
```

o modelo termina em 9 ciclos e 2 stalls sem forwarding, ou 7 ciclos e 0 stalls
com forwarding. Para `lw` seguido de um consumidor imediato, o perfil com
forwarding introduz 1 stall.

Todos os valores acima estão fixados em
`tests/pipeline-lab-microarchitecture.test.mjs`, que é deliberadamente separado
das suites funcionais da ISA. A reprodução de execuções registadas tem a sua
própria suite em `tests/pipeline-execution-trace.test.mjs`.

## Limitações conhecidas

- O modelo não executa o programa. No fluxo `static` não calcula valores, não lê
  memória e não observa o resultado real de um branch; no fluxo `execution` os
  valores e os resultados vêm do registo da execução, mas continuam a ser
  observações do runtime funcional e não algo que o modelo calcule.
- A reprodução só conhece instruções dentro do segmento de texto montado. Um
  tratador de exceções é contado em `execution.outsideProgram` e não atravessa
  o pipeline.
- Não modela caches, TLB, execução superscalar ou out-of-order. A previsão
  dinâmica limita-se à tabela de histórico descrita acima; não há preditor de
  dois níveis nem buffer de destino separado.
- A latência de fetch de instruções é sempre um ciclo.
- Instruções de vírgula flutuante e coprocessador não têm latência realista.
- O tratamento de exceções limita-se ao efeito no fetch; não há entrada no
  tratador nem `EPC`.

O runtime funcional normal do webMARS não é cycle-accurate e nunca deve ser
citado para comparações de desempenho. Ver
[comparison-matrix.md](comparison-matrix.md).
