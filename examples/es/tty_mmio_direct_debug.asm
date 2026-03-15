# Demo directo de depuracion MMIO de la TTY
# Abra Herramientas > TTY Device + ANSI Terminal y conecte la tool al MIPS.
# Este programa escribe directamente en el transmisor MMIO y luego hace eco de las teclas.
# Si aparecen el titulo y el marco, la salida TX esta funcionando.
# Si las teclas escritas se reflejan, la cola RX tambien se esta vaciando.

.data
title:      .asciiz "Depuracion directa MMIO de la TTY"
prompt:     .asciiz "Escriba dentro de la ventana TTY. Las teclas se reflejaran abajo."
box_on:     .byte 27, 40, 48, 0
box_off:    .byte 27, 40, 66, 0
ansi_reset: .byte 27, 99, 0
ansi_clear: .byte 27, 91, 50, 74, 27, 91, 72, 0
ansi_cyan:  .byte 27, 91, 57, 54, 109, 0
ansi_green: .byte 27, 91, 57, 50, 109, 0
ansi_norm:  .byte 27, 91, 48, 109, 0
nl:         .byte 13, 10, 0

.text
main:
  lui $s0, 0xffff                # base MMIO 0xFFFF0000

  la  $a0, ansi_reset
  jal send_zstr
  nop
  la  $a0, ansi_clear
  jal send_zstr
  nop
  la  $a0, ansi_cyan
  jal send_zstr
  nop
  la  $a0, title
  jal send_zstr
  nop
  la  $a0, ansi_norm
  jal send_zstr
  nop
  la  $a0, nl
  jal send_zstr
  nop

  la  $a0, box_on
  jal send_zstr
  nop
  li  $a0, 'l'
  jal send_byte
  nop
  li  $t0, 30
draw_top:
  li  $a0, 'q'
  jal send_byte
  nop
  addiu $t0, $t0, -1
  bgtz $t0, draw_top
  nop
  li  $a0, 'k'
  jal send_byte
  nop
  la  $a0, box_off
  jal send_zstr
  nop
  la  $a0, nl
  jal send_zstr
  nop

  la  $a0, prompt
  jal send_zstr
  nop
  la  $a0, nl
  jal send_zstr
  nop
  la  $a0, ansi_green
  jal send_zstr
  nop

echo_loop:
wait_rx:
  lbu  $t1, 0($s0)               # control del receptor
  andi $t1, $t1, 1
  beq  $t1, $zero, wait_rx
  nop

  lbu  $a0, 4($s0)               # datos del receptor
  jal  send_byte
  nop

  b    echo_loop
  nop

send_zstr:
  addiu $sp, $sp, -4
  sw   $ra, 0($sp)
  move $t9, $a0
send_zstr_loop:
  lbu  $a0, 0($t9)
  beq  $a0, $zero, send_zstr_done
  nop
  jal  send_byte
  nop
  addiu $t9, $t9, 1
  b    send_zstr_loop
  nop
send_zstr_done:
  lw   $ra, 0($sp)
  addiu $sp, $sp, 4
  jr   $ra
  nop

send_byte:
wait_tx:
  lbu  $t2, 8($s0)               # control del transmisor
  andi $t2, $t2, 1
  beq  $t2, $zero, wait_tx
  nop
  sb   $a0, 12($s0)              # datos del transmisor
  jr   $ra
  nop
