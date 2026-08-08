#Gleitkommatest für das Gleitkomma-Darstellungstool
#Schreibt IEEE-754-Bitmuster in $f12 und gibt sie als Float-Werte aus.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #rohe IEEE 754-Bit-Muster, keine Dezimalzahlen

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #Lesen Sie das 32-Bit-Muster als Ganzzahl
  mtc1 $t2, $f12   #Verschieben Sie die gleichen Bits in das FPU: Es findet keine Konvertierung statt

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #Systemaufruf 2 gibt $f12 als Float aus
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #nächstes Wort: Jedes Muster belegt vier Bytes
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
