# Floating point test for the Floating Point Representation tool
# Writes IEEE-754 bit patterns into $f12 and prints them as float values.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   # raw IEEE 754 bit patterns, not decimal numbers

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   # read the 32-bit pattern as an integer
  mtc1 $t2, $f12   # move the same bits into the FPU: no conversion happens

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   # syscall 2 prints $f12 read as a float
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   # next word: each pattern occupies four bytes
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
