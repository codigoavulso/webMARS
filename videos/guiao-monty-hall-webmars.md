# Guião de vídeo — Monty Hall em MIPS com o webMARS

## Ficha do vídeo

- **Título de trabalho:** Monty Hall em MIPS: quando trocar duplica a probabilidade
- **Duração prevista:** 18 minutos e 30 segundos
- **Formato:** tutorial de MIPS, experiência computacional e apresentação do webMARS
- **Idioma:** português europeu
- **Público:** estudantes de programação, arquitetura de computadores, matemática e curiosos
- **Ideia central:** a escolha inicial acerta em apenas 1/3 dos casos. Como Monty sabe onde está o prémio e nunca abre essa porta, trocar herda os 2/3 de probabilidade correspondentes às escolhas iniciais erradas.
- **Interface principal:** **TTY Device + ANSI Terminal**, por ser a forma mais rápida e visual de o utilizador interagir diretamente com o programa MIPS no browser.

## Objetivos

No final do vídeo, o espectador deverá:

1. compreender o problema de Monty Hall e por que razão trocar vence em cerca de 2/3 dos jogos;
2. perceber a diferença entre uma porta aberta ao acaso e uma porta aberta por alguém que conhece a posição do prémio;
3. reconhecer a estrutura básica de um programa MIPS: registos, memória, branches, ciclos, procedimentos, syscalls e MMIO;
4. saber usar o editor, assembler, debugger, breakpoints, Step, Backstep e o controlo de velocidade do webMARS;
5. conhecer a TTY ANSI, o Instruction Counter, o Instruction Statistics, o BHT Simulator e as métricas locais de execução;
6. perceber como milhares de simulações podem testar uma previsão matemática.

---

## Preparação antes de gravar

### Aplicação

- Abrir `https://webmars.nfiles.top/`.
- Confirmar que aparece a versão **0.4.7**.
- Abrir o programa de demonstração `monty_hall_lab.asm`.
- Montar a janela para que o editor, os registos e a TTY possam ser vistos sem sobreposição excessiva.
- Aumentar o zoom do browser se os textos dos registos não forem legíveis na gravação.

### Ferramentas

Abrir, mas revelar gradualmente durante o vídeo:

1. **TTY Device + ANSI Terminal**
2. **Instruction Counter**
3. **Instruction Statistics**
4. **Branch History Table Simulator**

Ligar cada ferramenta ao MIPS antes da execução em que será usada. A TTY deve ser ligada logo no início. O programa utiliza o mapa MMIO habitual:

| Endereço | Função |
|---|---|
| `0xffff0000` | controlo do recetor/teclado |
| `0xffff0004` | dados do recetor/teclado |
| `0xffff0008` | controlo do transmissor/ecrã |
| `0xffff000c` | dados do transmissor/ecrã |

### Configuração da experiência

- Usar uma seed fixa, por exemplo `20260725`, durante a gravação. Assim, um segundo take produz os mesmos resultados.
- Fazer uma execução prévia com 1 000 e outra com 100 000 jogos.
- Anotar os valores reais obtidos. No guião, valores como 33,3% e 66,7% são referências aproximadas e não números a inventar.
- Confirmar que:
  - `vitórias_ficar + vitórias_trocar = número_de_jogos`;
  - a estratégia de ficar se aproxima de 1/3;
  - a estratégia de trocar se aproxima de 2/3.
- Manter a velocidade baixa na demonstração com Step e máxima nas simulações grandes.
- Limpar a TTY e fazer Reset antes do take definitivo.

### Aspeto visual da TTY

Usar sequências ANSI para apresentar:

- título em ciano;
- portas fechadas em branco;
- cabra revelada em amarelo;
- vitória em verde;
- derrota em vermelho;
- resultados finais numa tabela com moldura.

Ecrã inicial sugerido:

```text
┌──────────────────────────────────────────────────────────────┐
│                 MONTY HALL — LABORATÓRIO MIPS               │
├──────────────────────────────────────────────────────────────┤
│  [1] Jogar uma ronda                                        │
│  [2] Simular 1 000 jogos                                    │
│  [3] Simular 100 000 jogos                                  │
│  [Q] Sair                                                   │
└──────────────────────────────────────────────────────────────┘
Escolha:
```

---

# Guião integral

## 00:00–00:40 — Abertura: a resposta contraintuitiva

### Imagem

- Começar diretamente na TTY.
- Mostrar três portas fechadas.
- Fazer uma escolha, revelar uma cabra e parar no pedido «Ficar ou trocar?».
- Corte rápido para a tabela de 100 000 simulações.

### Narração

> Há três portas. Atrás de uma está um prémio; atrás das outras duas estão cabras. Escolhemos uma porta. O apresentador, que sabe onde está o prémio, abre uma das outras portas e mostra uma cabra. Agora pergunta: ficamos com a escolha inicial ou trocamos?
>
> À primeira vista parecem restar duas portas, portanto seria natural dizer cinquenta por cento para cada uma. Mas não é isso que acontece. Trocar ganha aproximadamente dois jogos em cada três.
>
> Hoje vamos perceber porquê, escrever a experiência em Assembly MIPS e deixar o webMARS executar cem mil jogos diretamente no browser.

### Texto no ecrã

`Ficar ≈ 33,3% | Trocar ≈ 66,7%`

---

## 00:40–01:35 — Apresentação do webMARS e do plano

### Imagem

- Mostrar brevemente o editor, os registos, o segmento de texto, a memória e a TTY.
- Realçar que tudo está no browser.

### Narração

> Este é o webMARS, um ambiente MIPS no browser com editor, assembler, simulador, debugger, compilador Mini-C, documentação, projetos locais ou Cloud e ferramentas inspiradas no MARS clássico.
>
> Neste vídeo não vamos usar o computador como uma calculadora que simplesmente nos dá uma resposta. Vamos transformar uma pergunta de probabilidade num algoritmo, observar esse algoritmo ao nível das instruções e comparar a teoria com milhares de experiências.
>
> A TTY Device mais o terminal ANSI será a nossa interface principal. É a forma mais rápida de escrever e ler dados diretamente do MIPS no browser. Depois vamos abrir ferramentas de contagem de instruções, estatísticas e previsão de branches para perceber também o custo computacional da experiência.

---

## 01:35–03:15 — Definir corretamente o problema

### Imagem

- Desenhar três portas na TTY.
- Colocar um pequeno diagrama lateral:

```text
Escolha inicial:
  prémio       1/3
  cabra        2/3
```

### Narração

> O detalhe decisivo está nas regras. Primeiro, o prémio é colocado aleatoriamente numa das três portas. Depois, o concorrente escolhe uma porta sem qualquer informação. A probabilidade de acertar imediatamente é, portanto, um terço.
>
> Monty conhece a posição do prémio. Ele abre sempre uma porta que o concorrente não escolheu, nunca revela o prémio e oferece sempre a possibilidade de trocar.
>
> Estas restrições são importantes. Se alguém abrisse uma porta completamente ao acaso, poderia revelar o prémio e estaríamos perante outro problema. No Monty Hall clássico, a ação do apresentador transporta informação.
>
> Podemos resumir tudo numa pergunta simples: a nossa primeira escolha estava certa ou errada? Se estava certa, ficar ganha. Se estava errada, Monty é obrigado a eliminar a única porta errada que ainda podia abrir, e trocar conduz ao prémio.

### Animação sugerida

```text
Escolha inicial certa  (1/3) -> ficar ganha, trocar perde
Escolha inicial errada (2/3) -> ficar perde, trocar ganha
```

---

## 03:15–04:35 — A matemática e a intuição humana

### Imagem

- Mostrar 100 portas por alguns segundos, reduzindo depois novamente para três.

### Narração

> A versão com cem portas costuma tornar a intuição mais clara. Escolhemos uma porta, com apenas um por cento de probabilidade de conter o prémio. Monty abre noventa e oito portas que sabe terem cabras e deixa fechada apenas a nossa porta e mais uma.
>
> Seria estranho acreditar que a nossa escolha inicial saltou magicamente de um por cento para cinquenta por cento. Ela continua a ter um por cento. A outra porta fechada concentra os restantes noventa e nove por cento.
>
> Com três portas acontece exatamente o mesmo: a escolha inicial conserva o seu um terço e a única alternativa que Monty deixa fechada concentra os outros dois terços.
>
> A probabilidade não mudou por Monty ter movido o prémio. O prémio nunca se move. Mudou o nosso conhecimento sobre o sistema, porque observámos uma ação condicionada pela informação do apresentador.

### Texto no ecrã

`P(escolha inicial correta) = 1/3`

`P(escolha inicial errada) = 2/3`

`Trocar ganha precisamente quando a escolha inicial estava errada.`

---

## 04:35–06:10 — Traduzir a experiência para MIPS

### Imagem

- Voltar ao editor.
- Mostrar o mapa conceptual dos registos.

| Registo | Papel no programa |
|---|---|
| `$t0` | porta do prémio, de 0 a 2 |
| `$t1` | primeira escolha |
| `$t2` | porta aberta por Monty |
| `$t3` | porta escolhida após trocar |
| `$s0` | número total de experiências |
| `$s1` | vitórias ao ficar |
| `$s2` | vitórias ao trocar |
| `$s3` | contador do ciclo |

### Narração

> Vamos representar as portas pelos números zero, um e dois. Isto permite usar uma pequena propriedade útil: a soma das três portas é três.
>
> Guardamos temporariamente a porta do prémio em `$t0`, a escolha inicial em `$t1`, a porta aberta por Monty em `$t2` e a porta final da estratégia de troca em `$t3`.
>
> Os registos `$s0`, `$s1` e `$s2` mantêm valores que atravessam muitas chamadas: o total de jogos e os dois contadores de vitórias. Pela convenção MIPS, os registos `$s` são adequados para estado preservado e os `$t` para valores temporários.
>
> O programa tem duas camadas. A primeira joga uma ronda interativa através da TTY. A segunda repete a mesma lógica milhares de vezes, sem animação, para medir as frequências.

---

## 06:10–07:25 — Números pseudoaleatórios e syscalls

### Imagem

- Ampliar o excerto que inicializa a stream aleatória.

```asm
# Stream 7, seed fixa para uma gravação reproduzível
li   $v0, 40
li   $a0, 7
li   $a1, 20260725
syscall

# Resultado aleatório em [0, 3)
li   $v0, 42
li   $a0, 7
li   $a1, 3
syscall
move $t0, $a0
```

### Narração

> O webMARS implementa as syscalls aleatórias do MARS. A syscall 40 define a seed de uma stream e a syscall 42 devolve um inteiro num intervalo.
>
> Em `$v0` colocamos o número do serviço. Em `$a0`, o identificador da stream. Em `$a1`, o limite superior, aqui três. O resultado da syscall 42 regressa em `$a0`, no intervalo de zero inclusive a três exclusivo.
>
> Uma seed fixa não torna a experiência menos válida. Torna-a reproduzível: a sequência parece aleatória para a simulação, mas podemos repetir exatamente o mesmo take. Se alterarmos a seed, obteremos outra amostra e as percentagens continuarão a aproximar-se dos valores teóricos.

### Nota de edição

Colocar no ecrã: `syscall 42 -> 0, 1 ou 2`.

---

## 07:25–08:55 — Programar o comportamento informado de Monty

### Imagem

- Mostrar primeiro o caso em que a escolha inicial está errada.

```asm
# Se escolha != prémio, a porta de Monty é forçada.
# Como 0 + 1 + 2 = 3:
li   $t2, 3
subu $t2, $t2, $t0       # 3 - prémio
subu $t2, $t2, $t1       # 3 - prémio - escolha
```

- Mostrar depois o cálculo da troca.

```asm
# Única porta que não é a escolha nem a porta aberta
li   $t3, 3
subu $t3, $t3, $t1
subu $t3, $t3, $t2
```

### Narração

> Este é o coração lógico da experiência. Quando a escolha inicial é diferente da porta do prémio, Monty não tem liberdade: existe uma única porta que ele pode abrir. Subtraímos de três a porta do prémio e a escolha do jogador, obtendo automaticamente a porta com a outra cabra.
>
> Quando o jogador acertou logo no prémio, Monty pode escolher aleatoriamente uma das duas portas restantes. Essa escolha não altera a estratégia: se o jogador trocar, perde em qualquer dos casos.
>
> Finalmente, a nova escolha também pode ser calculada com a soma três: retiramos a escolha inicial e a porta que Monty abriu. O número restante é a porta da troca.
>
> Reparem que não simulámos um apresentador que abre uma porta ao acaso. Codificámos explicitamente o conhecimento de Monty. Se esta condição estiver errada no programa, estaremos a simular outro problema e obteremos outra distribuição.

---

## 08:55–10:35 — Debugger: observar uma ronda instrução a instrução

### Imagem e ações

1. Colocar um breakpoint imediatamente depois de calcular a porta de Monty.
2. Montar o programa.
3. Correr a baixa velocidade.
4. Na TTY, escolher a porta `1`.
5. Quando o breakpoint parar:
   - realçar `$t0`, `$t1`, `$t2` e `$t3`;
   - fazer um Step;
   - fazer um Backstep;
   - voltar a fazer Step e continuar.

### Narração

> Antes de executar cem mil jogos, vamos verificar uma única ronda. Coloco um breakpoint depois da decisão de Monty e monto o programa.
>
> Escolho a primeira porta na TTY. O programa para exatamente no ponto que definimos. Nos registos vemos a posição do prémio, a minha escolha e a porta que o apresentador pode abrir.
>
> Com Step executamos uma instrução de cada vez. O segmento de texto mostra a instrução atual e o painel de registos mostra imediatamente o resultado.
>
> Se eu fizer Backstep, o webMARS restaura o snapshot anterior: registos, memória, stream aleatória, input e estado dos dispositivos. Isto é particularmente útil em programas não determinísticos, porque podemos recuar sem perder a sequência que estávamos a analisar.
>
> Continuamos e o debugger atravessa corretamente o breakpoint onde já tinha parado. Não é necessário removê-lo para avançar.

### Ponto pedagógico

Explicar rapidamente:

- `beq` e `bne` tomam decisões;
- `subu` faz a aritmética das portas;
- `jal` chama procedimentos;
- `jr $ra` regressa;
- `$ra` contém o endereço de retorno;
- a pilha preserva `$ra` quando um procedimento chama outro.

---

## 10:35–12:05 — Jogar através da TTY Device + ANSI Terminal

### Imagem e ações

- Maximizar temporariamente a TTY.
- Clicar dentro do terminal para lhe dar foco.
- Escolher a opção `[1] Jogar uma ronda`.
- Escolher uma porta com as teclas `1`, `2` ou `3`.
- Mostrar Monty a abrir uma porta.
- Responder `F` para ficar ou `T` para trocar.
- Repetir rapidamente com a outra estratégia.

### Narração

> Agora usamos a TTY como uma interface real do programa. Não estamos a escrever num campo HTML ligado artificialmente ao simulador. O teclado alimenta o recetor MMIO e o MIPS verifica o bit de disponibilidade em `0xffff0000`. Quando existe uma tecla, lê o byte em `0xffff0004`.
>
> Para escrever, o programa espera que o transmissor esteja disponível em `0xffff0008` e envia cada carácter para `0xffff000c`. As cores, a posição do cursor e as molduras são sequências ANSI produzidas pelo próprio programa.
>
> Escolho a porta dois. Monty revela uma cabra. Desta vez vou ficar. O terminal mostra se ganhei ou perdi e apresenta o estado completo da ronda.
>
> Uma ou duas partidas não demonstram a probabilidade. Servem para validar as regras e perceber a interação. Para distinguir um terço de dois terços precisamos de repetir a experiência muitas vezes.

### Excerto MMIO a mostrar

```asm
lui  $s7, 0xffff

wait_rx:
  lbu  $t4, 0($s7)
  andi $t4, $t4, 1
  beq  $t4, $zero, wait_rx
  lbu  $v0, 4($s7)

wait_tx:
  lbu  $t4, 8($s7)
  andi $t4, $t4, 1
  beq  $t4, $zero, wait_tx
  sb   $a0, 12($s7)
```

---

## 12:05–13:55 — De uma ronda para cem mil simulações

### Imagem

- Mostrar o ciclo principal.

```asm
simulation_loop:
  jal  simulate_round
  nop

  addiu $s3, $s3, 1
  bne   $s3, $s0, simulation_loop
  nop
```

- Na TTY, escolher `[2] Simular 1 000 jogos`.
- Depois escolher `[3] Simular 100 000 jogos`.
- Antes da segunda execução, colocar a velocidade no máximo.

### Narração

> A grande vantagem do computador é transformar a mesma regra numa experiência repetível. Em cada passagem pelo ciclo sorteamos a porta do prémio e uma escolha inicial.
>
> Se escolha e prémio forem iguais, incrementamos o contador da estratégia de ficar. Caso contrário, incrementamos o contador da estratégia de trocar. No problema clássico, estas condições são complementares: em cada jogo ganha exatamente uma das duas estratégias.
>
> Começamos com mil jogos. Os valores já se aproximam de um terço e dois terços, mas ainda oscilam. Agora passamos para cem mil e colocamos a execução na velocidade máxima.
>
> O realce contínuo do editor seria demasiado caro nesta escala, por isso o webMARS reduz o trabalho visual durante a execução rápida. O motor e as ferramentas ligadas continuam, no entanto, a receber os dados necessários.

### Resultado esperado na TTY

Usar os números efetivamente produzidos durante o ensaio:

```text
┌──────────────── RESULTADOS ────────────────┐
│ Jogos:                 100 000             │
│ Ficar:                  ~33 333  (~33,3%)  │
│ Trocar:                 ~66 667  (~66,7%)  │
│ Diferença:              ~33 334            │
└────────────────────────────────────────────┘
```

### Nota importante para a narração

Não dizer que a simulação «prova» sozinha o teorema. Dizer:

> A matemática prevê os valores exatos de um terço e dois terços. A simulação testa a implementação e mostra empiricamente a convergência para essa previsão.

---

## 13:55–16:05 — Medir o programa com as ferramentas do webMARS

### 13:55–14:35 — Instruction Counter

#### Imagem

- Mostrar o total de instruções para 1 000 jogos.
- Reset da ferramenta.
- Repetir com 100 000 jogos.

#### Narração

> O Instruction Counter mostra quantas instruções MIPS foram realmente executadas. Se multiplicarmos o número de experiências por cem, o total cresce aproximadamente na mesma proporção, descontando a preparação e a impressão final.
>
> Isto liga a complexidade abstrata ao trabalho concreto do processador. O algoritmo é linear: duplicar o número de jogos duplica aproximadamente o trabalho.

### 14:35–15:10 — Instruction Statistics

#### Imagem

- Mostrar categorias dominantes.

#### Narração

> As estatísticas de instruções revelam a composição do programa: aritmética para calcular portas e contadores, branches para tomar decisões e controlar o ciclo, acessos à memória para strings e estado, e syscalls para o gerador pseudoaleatório.
>
> Na fase interativa vemos mais atividade de memória e MMIO. Na simulação silenciosa, os cálculos e os branches dominam.

### 15:10–15:45 — Branch History Table Simulator

#### Imagem

- Mostrar a entrada correspondente ao branch do ciclo.
- Mostrar a precisão a estabilizar.

#### Narração

> O BHT Simulator permite observar como um preditor de desvios aprende o comportamento dos branches.
>
> O branch que fecha o ciclo é tomado quase sempre e falha apenas no final, portanto torna-se altamente previsível. Já o branch que separa escolha certa de escolha errada segue aproximadamente a distribuição de um terço contra dois terços.
>
> O mesmo programa que ensina probabilidade passa assim a ensinar controlo de fluxo e previsão de desvios.

### 15:45–16:05 — Métricas do runtime

#### Imagem

- Realçar a faixa compacta de benchmark do webMARS.

#### Narração

> A faixa de benchmark regista o tempo de montagem, o tempo de execução, o throughput e uma estimativa de utilização JavaScript.
>
> Esta percentagem representa tempo ocupado na thread principal dividido pelo tempo decorrido. Não é a percentagem total de CPU do sistema operativo, mas é muito útil para comparar versões do algoritmo e perceber o peso da apresentação visual.

---

## 16:05–17:35 — Interpretar os resultados

### Imagem

- Colocar lado a lado a árvore de probabilidades e a tabela da TTY.

```text
Escolha correta: 1/3 -> ficar
Escolha errada:  2/3 -> trocar
```

### Narração

> Os resultados aproximam-se da previsão: cerca de um terço de vitórias ao ficar e dois terços ao trocar.
>
> A explicação não é que Monty transferiu fisicamente probabilidade de uma porta para outra. A nossa escolha inicial tinha um terço de probabilidade e continua a tê-lo.
>
> Os outros dois terços pertenciam ao conjunto das duas portas que não escolhemos. Como Monty usa conhecimento para remover desse conjunto uma porta que sabe ser perdedora, toda a probabilidade desse conjunto fica representada pela única porta que permanece fechada.
>
> A frase mais curta para recordar é esta: trocar ganha sempre que a primeira escolha estava errada. E uma escolha feita entre três portas estava errada em dois terços dos casos.
>
> Também percebemos por que razão a formulação exata do problema interessa. Se Monty nem sempre oferecesse a troca, se pudesse abrir o prémio ou se escolhesse portas segundo outra regra, teríamos de alterar o modelo e recalcular as probabilidades.

### Verificação de sanidade no ecrã

`vitórias_ficar + vitórias_trocar = total_de_jogos`

> Esta igualdade é um excelente teste ao programa. Se falhar, há um erro na implementação da ronda ou na contagem.

---

## 17:35–18:30 — Conclusão e chamada para ação

### Imagem

- Voltar ao enquadramento geral do webMARS.
- Mostrar rapidamente editor, TTY, registos e ferramentas.
- Terminar com o endereço da aplicação e o repositório.

### Narração

> Neste tutorial começámos com um paradoxo de intuição, transformámo-lo num modelo matemático e depois num programa MIPS.
>
> Usámos registos, ciclos, branches, procedimentos, syscalls aleatórias e dispositivos mapeados em memória. Jogámos através de uma TTY ANSI, depurámos uma ronda instrução a instrução e medimos cem mil simulações com as ferramentas do webMARS.
>
> Esta é precisamente a ideia do webMARS: tornar a arquitetura MIPS observável e interativa sem instalar nada, diretamente no browser.
>
> Experimentem alterar a seed, o número de simulações ou até o número de portas. Depois comparem a previsão matemática com os resultados e usem as ferramentas para perceber o custo da vossa solução.
>
> Se este tipo de experiência vos interessa, testem o webMARS, consultem o código no GitHub e partilhem o vosso próprio programa. Até ao próximo laboratório.

### Cartão final

```text
webMARS
MIPS no browser — editar, montar, executar, depurar e medir

https://webmars.nfiles.top/
github.com/codigoavulso/webMARS
```

---

# Estrutura técnica sugerida para `monty_hall_lab.asm`

O programa mostrado no vídeo deverá estar dividido em procedimentos pequenos, para facilitar o ensino e o uso do debugger:

```text
main
├── tty_init
├── draw_menu
├── read_key
├── play_interactive_round
│   ├── rand3
│   ├── choose_host_door
│   ├── choose_switch_door
│   └── draw_round
├── run_simulation
│   ├── simulate_round
│   ├── rand3
│   ├── choose_host_door
│   └── choose_switch_door
├── print_results
│   ├── tty_puts
│   ├── tty_putint
│   └── print_percent_hundredths
└── exit
```

## Contratos dos procedimentos

| Procedimento | Entrada | Saída |
|---|---|---|
| `rand3` | nenhuma; usa stream configurada | `$v0` ou `$a0` normalizado para 0–2 |
| `choose_host_door` | prémio e escolha | porta válida com cabra |
| `choose_switch_door` | escolha e porta aberta | única porta restante |
| `simulate_round` | nenhuma | incrementa um dos contadores |
| `read_key` | teclado TTY | carácter lido |
| `tty_putc` | carácter em `$a0` | escreve no transmissor MMIO |
| `tty_puts` | endereço em `$a0` | escreve string terminada por zero |

## Cálculo de percentagens sem vírgula flutuante

Para apresentar duas casas decimais:

```text
percentagem_em_centésimos = vitórias × 10 000 / total

3333 -> 33,33%
6667 -> 66,67%
```

Com 100 000 experiências, `vitórias × 10 000` continua dentro do intervalo inteiro de 32 bits. Em MIPS, o exemplo pode usar `multu`, `mflo`, `divu`, `mflo` e depois separar a parte inteira e as duas casas decimais.

---

# Plano de captação

## Take principal

1. TTY: abertura e pergunta «ficar ou trocar?».
2. TTY: resultado de 100 000 simulações.
3. Editor: apresentação do webMARS.
4. Diagrama: explicação de 1/3 e 2/3.
5. Editor: registos e syscall aleatória.
6. Editor: lógica da porta de Monty.
7. Debugger: breakpoint, Step e Backstep.
8. TTY: ronda interativa completa.
9. TTY: 1 000 e 100 000 simulações.
10. Ferramentas: Counter, Statistics e BHT.
11. Benchmark: tempo e utilização JavaScript.
12. Conclusão e cartão final.

## B-roll útil

- Assemble sem erros.
- Alteração da velocidade de execução.
- Registos a mudar durante Step.
- Segmento de texto com branch realçado.
- Tecla a entrar na TTY e carácter a sair por MMIO.
- Contador de instruções a crescer.
- BHT a atualizar.
- Tabela final em ANSI.
- Janela de ajuda das syscalls 40 e 42.

## Cortes a evitar

- Não mostrar credenciais, sessões Cloud ou dados de utilizadores.
- Não deixar notificações pessoais ou outros separadores visíveis.
- Não afirmar que uma amostra finita produz exatamente 1/3 e 2/3.
- Não omitir as regras informadas de Monty; sem elas, o problema muda.
- Não chamar «CPU do sistema» à percentagem JS do benchmark.
- Não executar a simulação grande com animação da TTY em cada ronda; imprimir apenas o resumo.

---

# Sugestões de título e miniatura

## Títulos

1. **Monty Hall em MIPS: trocar duplica mesmo a probabilidade?**
2. **100 000 jogos de Monty Hall em Assembly MIPS**
3. **Probabilidade contra a intuição — Monty Hall no webMARS**

## Texto curto para miniatura

`TROCAR = 2× MAIS HIPÓTESES?`

## Composição da miniatura

- três portas à esquerda;
- uma cabra revelada;
- código MIPS ao fundo;
- TTY do webMARS com `33% vs 67%`;
- seta forte da porta inicial para a porta da troca.

---

# Frase promocional curta

> Aprende MIPS enquanto investigas um dos problemas mais contraintuitivos da probabilidade: joga no terminal, segue cada instrução e deixa o webMARS testar cem mil portas diretamente no browser.
