# Benchmark de cache: acesso sequencial versus stride de 16 palavras.
# Abra Ferramentas > Data Cache Simulation Tool e ligue-a ao MIPS.
#
# Cada execucao mede apenas um padrao com a cache fria. Defina ACCESS_PATTERN
# como 1 ou 2, reinicie as estatisticas e volte a montar e executar.
# Ambos os padroes fazem 1024 loads; nao existem stores de inicializacao.

.eqv ACCESS_PATTERN 1    # 1 = sequencial, 2 = stride de 16 palavras
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  # Padrao 1: enderecos sequenciais.
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  # Padrao 2: visita cada 16a palavra e depois avanca o offset inicial.
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
