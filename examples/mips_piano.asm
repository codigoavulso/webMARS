# MIPS Piano
# L. van Beethoven | Op. 67
# Muxi Xie | CC0 1.0 | IMSLP #1046120
# https://imslp.org/wiki/Symphony_No.5_(Beethoven,_Ludwig_van)#For_Piano_solo
#
# A negative word waits for that many milliseconds. Zero ends the movement.
# A note word packs its duration, MIDI velocity and pitch as 0xDDDDVVPP.
# Syscall 31 starts notes without waiting, so they can sound together.

.data
title:     .asciiz "\n=== MIPS Piano ===\nBeethoven | Symphony No. 5 in C minor, Op. 67\nMuxi Xie | CC0 1.0\n"
heading_1: .asciiz "\nI. Allegro con brio\n"
heading_2: .asciiz "\nII. Andante con moto\n"
heading_3: .asciiz "\nIII. Allegro\n"
heading_4: .asciiz "\nIV. Allegro - Presto\n"
done:      .asciiz "\nFine\n"

.align 2
programme:
  .word heading_1, movement_1, 700
  .word heading_2, movement_2, 700
  .word heading_3, movement_3, 0
  .word heading_4, movement_4, 0
  .word 0, 0, 0

.include "mips_piano_01_allegro_con_brio.asm"
.include "mips_piano_02_andante_con_moto.asm"
.include "mips_piano_03_allegro.asm"
.include "mips_piano_04_finale.asm"

.text
.globl main
main:
  li    $v0, 4
  la    $a0, title
  syscall

  la    $s1, programme
  li    $s2, 0          # General MIDI patch 0: Acoustic Grand Piano.

next_movement:
  lw    $a0, 0($s1)
  beqz  $a0, finish
  nop
  li    $v0, 4
  syscall
  lw    $s0, 4($s1)

next_event:
  lw    $t0, 0($s0)
  addiu $s0, $s0, 4
  beqz  $t0, movement_end
  nop
  bltz  $t0, wait_event
  nop

  andi  $a0, $t0, 0xff
  srl   $a1, $t0, 16
  move  $a2, $s2
  srl   $a3, $t0, 8
  andi  $a3, $a3, 0xff
  li    $v0, 31
  syscall
  b     next_event
  nop

wait_event:
  subu  $a0, $zero, $t0
  li    $v0, 32
  syscall
  b     next_event
  nop

movement_end:
  lw    $a0, 8($s1)
  addiu $s1, $s1, 12
  beqz  $a0, next_movement
  nop
  li    $v0, 32
  syscall
  b     next_movement
  nop

finish:
  li    $v0, 4
  la    $a0, done
  syscall
  li    $v0, 10
  syscall
