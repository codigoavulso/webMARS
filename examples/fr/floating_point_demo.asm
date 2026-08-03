#Test de virgule flottante pour l'outil de représentation en virgule flottante
#Écrit des modèles IEEE-754 bits dans $f12 et les imprime sous forme de valeurs flottantes.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #brut IEEE modèles de 754 bits, pas de nombres décimaux

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #lire le modèle 32 bits sous forme d'entier
  mtc1 $t2, $f12   #déplacer les mêmes bits dans le FPU : aucune conversion ne se produit

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 imprime $f12 lu comme un flottant
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #mot suivant : chaque motif occupe quatre octets
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
