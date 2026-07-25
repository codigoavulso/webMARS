# Benchmark de cache: acceso secuencial frente a stride de 16 palabras.
# Abra Herramientas > Data Cache Simulation Tool, conectela a MIPS y marque Enabled.
#
# Cada ejecucion mide un solo patron con la cache fria. Defina ACCESS_PATTERN
# como 1 o 2, reinicie las estadisticas y vuelva a ensamblar y ejecutar.
# Ambos patrones hacen 1024 loads; no hay stores de inicializacion.

.eqv ACCESS_PATTERN 1    # 1 = secuencial, 2 = stride de 16 palabras
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

  # Patron 1: direcciones secuenciales.
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

  # Patron 2: visita cada 16a palabra y despues avanza el offset inicial.
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
