#Test in virgola mobile per lo strumento Rappresentazione in virgola mobile
#Scrive IEEE-754 bit pattern in $f12 e li stampa come valori float.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #grezzi IEEE modelli a 754 bit, non numeri decimali

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #leggere il modello a 32 bit come un numero intero
  mtc1 $t2, $f12   #sposta gli stessi bit in FPU: non avviene alcuna conversione

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 stampa $f12 letto come float
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #parola successiva: ogni pattern occupa quattro byte
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
