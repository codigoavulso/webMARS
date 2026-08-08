# Pipeline Lab

O Pipeline Lab é um simulador de ciclos separado do runtime funcional do
webMARS. Reutiliza as instruções produzidas pelo assembler, mas não altera o
estado, o PC, os registos nem a memória da execução normal.

## Perfil inicial `PL-5S/0.1`

Este perfil, introduzido durante o desenvolvimento da v0.6.0, é determinístico,
single-issue e in-order. Tem cinco estágios:

| Estágio | Significado no perfil inicial |
| --- | --- |
| IF | Entrada da instrução seguinte do fluxo montado. |
| ID | Descodificação e leitura lógica dos operandos. |
| EX | Operação da ALU ou cálculo lógico do endereço. |
| MEM | Acesso lógico à memória; a latência é sempre um ciclo. |
| WB | Conclusão da instrução e escrita lógica do resultado. |

Cada estágio contém uma instrução, uma bolha identificada ou está vazio. Os
registos de pipeline são representados pela transição do conteúdo entre os
estágios no fim de cada ciclo. A instrução é contabilizada como concluída
quando entra em WB. O CPI mostrado é `ciclos / instruções concluídas`.

### Hazards de dados

O perfil deteta dependências RAW entre os registos lidos pela instrução em ID e
os registos escritos por instruções anteriores.

- Sem forwarding, a instrução fica em ID enquanto o produtor estiver em EX ou
  MEM. O valor escrito em WB pode ser lido no mesmo ciclo.
- Com forwarding, as dependências de resultados ALU não param o pipeline. Uma
  dependência load-use com o load em EX introduz exatamente uma bolha.
- `$zero` nunca é tratado como destino de uma dependência.

Durante um stall, IF e ID mantêm o seu conteúdo e entra uma bolha em EX. A linha
temporal marca o ciclo retido em ID como `ID*`. Alterar a configuração de
forwarding reinicia a simulação, garantindo que uma linha temporal nunca mistura
dois perfis.

### Controlo e reprodução

É possível avançar um ciclo, recuar para o estado exato anterior, reiniciar ou
executar até o pipeline esvaziar. O histórico inclui estágios, próximo índice,
métricas, último hazard e linha temporal, pelo que o retrocesso é determinístico.
Para programas grandes, o histórico guarda apenas as linhas alteradas em cada
ciclo e a interface mostra uma janela móvel de até 160 instruções e 80 ciclos.
Esta representação incremental e virtualização não perdem estado do simulador e
evitam cópias quadráticas ou milhões de células no browser.

## Exemplos de referência

Para três instruções, em que a segunda lê o resultado ALU da primeira:

```mips
add $t0, $t1, $t2
sub $t3, $t0, $t4
or  $t5, $t6, $t7
```

o perfil termina em 9 ciclos e 2 stalls sem forwarding, ou 7 ciclos e 0 stalls
com forwarding. Para `lw` seguido de um consumidor imediato, o perfil com
forwarding introduz 1 stall.

## Limitações conhecidas

O perfil inicial percorre estaticamente a sequência montada. Ainda não resolve
branches ou jumps, não modela delay slots, flushes, exceções, hazards
estruturais, caches nem latência variável da memória. Operações desconhecidas
podem aparecer na linha temporal, mas não recebem semântica de dependências
completa. Por isso, o Pipeline Lab inicial serve para estudar o fluxo de cinco
estágios e hazards RAW; não deve ser apresentado como execução MIPS
cycle-accurate completa.

Estas limitações são visíveis na própria ferramenta e correspondem aos passos
seguintes registados em `todo.md`.
