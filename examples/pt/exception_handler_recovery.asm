# Demo de exception handler com recuperacao.
# A store desalinhada gera Address Error (store). O handler guarda Cause,
# EPC e BadVAddr, ignora a instrucao que falhou e regressa com ERET.

.data
recovered:     .asciiz "Recuperacao da excecao concluida.\n"
cause_label:   .asciiz "Cause: "
epc_label:     .asciiz "EPC: "
badvaddr_label:.asciiz "BadVAddr: "
newline:       .asciiz "\n"
saved_cause:   .word 0
saved_epc:     .word 0
saved_badvaddr:.word 0

.text
main:
  # Esta store desalinhada é deliberada: transfere o controlo para 0x80000180.
  li $t0, 0x12345678
  sw $t0, 1($zero)

  # O handler altera EPC para que a execução retome precisamente nesta instrução.
  li $v0, 4
  la $a0, recovered
  syscall

  la $a0, cause_label
  syscall
  lw $a0, saved_cause
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, epc_label
  syscall
  lw $a0, saved_epc
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, badvaddr_label
  syscall
  lw $a0, saved_badvaddr
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

.ktext 0x80000180
exception_handler:
  # No CP0, Cause=$13, EPC=$14 e BadVAddr=$8.
  # $k0/$k1 são reservados ao kernel e não corrompem os registos do programa interrompido.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  # Ignorar a instrução de quatro bytes que causou a exceção antes de executar ERET.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
