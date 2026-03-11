# Demo do Keyboard and Display MMIO Simulator
# Abra Ferramentas > Keyboard and Display MMIO Simulator
# Escreva na area inferior do teclado; os caracteres sao ecoados na area superior do display.

.data
msg0: .asciiz "\n=== Keyboard/Display MMIO demo ===\n"
msg1: .asciiz "Open Tools > Keyboard and Display MMIO Simulator and connect to MIPS.\n"
msg2: .asciiz "Typed characters will be echoed by MMIO transmitter.\n"

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $s0, 0xffff         # base MMIO 0xFFFF0000

mmio_loop:
  # esperar recetor do teclado pronto (bit0 @ 0x0000)
wait_rx:
  lbu  $t0, 0x0000($s0)
  andi $t0, $t0, 1
  beq  $t0, $zero, wait_rx

  # ler char @ 0x0004
  lbu  $t1, 0x0004($s0)

  # esperar transmissor do display pronto (bit0 @ 0x0008)
wait_tx:
  lbu  $t2, 0x0008($s0)
  andi $t2, $t2, 1
  beq  $t2, $zero, wait_tx

  # escrever char @ 0x000C
  sb   $t1, 0x000c($s0)

  j mmio_loop
