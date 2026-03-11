# Prueba de coma flotante para la herramienta Floating Point Representation
# Escribe patrones IEEE-754 en $f12 y los imprime como valores float.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)
  mtc1 $t2, $f12

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
