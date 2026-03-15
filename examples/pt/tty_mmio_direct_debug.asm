# Demo direto de debug MMIO da TTY
# Abra Ferramentas > TTY Device + ANSI Terminal e ligue a tool ao MIPS.
# Este programa escreve diretamente no transmissor MMIO e depois faz eco das teclas.
# Se o titulo e a moldura aparecerem, a saida TX esta a funcionar.
# Se as teclas digitadas forem ecoadas, a fila RX tambem esta a ser drenada.

.data
title:      .asciiz "Debug direto MMIO da TTY"
prompt:     .asciiz "Escreva dentro da janela TTY. As teclas serao ecoadas abaixo."
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
  lbu  $t1, 0($s0)               # controlo do recetor
  andi $t1, $t1, 1
  beq  $t1, $zero, wait_rx
  nop

  lbu  $a0, 4($s0)               # dados do recetor
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
  lbu  $t2, 8($s0)               # controlo do transmissor
  andi $t2, $t2, 1
  beq  $t2, $zero, wait_tx
  nop
  sb   $a0, 12($s0)              # dados do transmissor
  jr   $ra
  nop
