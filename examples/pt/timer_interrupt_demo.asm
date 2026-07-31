# Demonstracao de interrupcoes do System Clock do webMARS
# Abra Ferramentas > System Clock and Timer, ligue a MIPS, monte e execute.
# Um temporizador simulado e deterministico interrompe a cada 200 instrucoes.

.eqv CLOCK_CONTROL 0xffff0050
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Interrupcoes do temporizador tratadas: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3
  sw $t1, 0($t0)
esperar:
  lw $t2, ticks
  blt $t2, 5, esperar
  nop
  sw $zero, 0($t0)
  li $v0, 4
  la $a0, message
  syscall
  li $v0, 1
  move $a0, $t2
  syscall
  li $v0, 11
  li $a0, 10
  syscall
  li $v0, 10
  syscall
.ktext 0x80000180
tratador:
  mfc0 $k0, $13
  andi $k0, $k0, 0x0400
  beq $k0, $zero, terminar_tratador
  nop
  la $k1, ticks
  lw $k0, 0($k1)
  addiu $k0, $k0, 1
  sw $k0, 0($k1)
terminar_tratador:
  eret
