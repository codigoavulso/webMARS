# MIPS Piano
#
# MARS syscall 33 plays one MIDI note and waits for its duration. The four
# arguments are pitch, duration in milliseconds, General MIDI instrument and
# volume. Instrument 0 is Acoustic Grand Piano; values 0..127 select the other
# General MIDI patches emulated directly by webMARS through Web Audio.
#
# This example needs no Tool window or Run I/O input: assemble it and press Run.
# It plays a short public-domain melody, then uses asynchronous syscall 31 to
# start three notes together as a final C-major chord.

.data
title: .asciiz "\n=== MIPS Piano ===\nPlaying Ode to Joy with MIDI syscalls 31 and 33...\n"
done:  .asciiz "Done. Change $s1 from 0 to 127 to explore other instruments.\n"

# Each pair is MIDI pitch followed by duration in milliseconds.
# 60 is middle C; neighbouring numbers are semitones.
.align 2
melody:
  .word 64,220, 64,220, 65,220, 67,220
  .word 67,220, 65,220, 64,220, 62,220
  .word 60,220, 60,220, 62,220, 64,220
  .word 64,330, 62,110, 62,440
  .word -1,0

.text
.globl main
main:
  li   $v0, 4
  la   $a0, title
  syscall

  la   $s0, melody       # Current pitch/duration pair.
  li   $s1, 0            # General MIDI patch 0: Acoustic Grand Piano.

play_melody:
  lw   $t0, 0($s0)
  bltz $t0, final_chord
  lw   $t1, 4($s0)

  li   $v0, 33           # Synchronous MIDI output.
  move $a0, $t0          # Pitch: 0..127.
  move $a1, $t1          # Duration in milliseconds.
  move $a2, $s1          # Instrument: 0..127.
  li   $a3, 104          # MIDI velocity/volume: 0..127.
  syscall

  addiu $s0, $s0, 8
  b    play_melody

final_chord:
  # Syscall 31 returns immediately, so these voices overlap as a chord.
  li   $v0, 31
  li   $a0, 60           # C
  li   $a1, 1200
  move $a2, $s1
  li   $a3, 100
  syscall

  li   $v0, 31
  li   $a0, 64           # E
  li   $a1, 1200
  move $a2, $s1
  li   $a3, 88
  syscall

  li   $v0, 31
  li   $a0, 67           # G
  li   $a1, 1200
  move $a2, $s1
  li   $a3, 88
  syscall

  # Keep the program alive until the asynchronous chord has finished.
  li   $v0, 32
  li   $a0, 1250
  syscall

  li   $v0, 4
  la   $a0, done
  syscall

  li   $v0, 10
  syscall
