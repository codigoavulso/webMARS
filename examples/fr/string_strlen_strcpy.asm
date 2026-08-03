#Démo des utilitaires de chaînes : strlen + strcpy (manuel)
#Les deux routines parcourent octet par octet jusqu'au terminateur zéro.
#Ce sont des fonctions feuilles, elles n'ont donc pas besoin de sauvegarder $ra sur la pile.

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal stocke l'adresse de retour dans $ra ; les arguments/résultats suivent les registres o32.
  la   $a0, src
  jal  my_strlen
  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  la   $a0, dst
  la   $a1, src
  jal  my_strcpy

  li $v0, 4
  la $a0, msg1
  syscall

  li $v0, 4
  la $a0, dst
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#a0 = char* s ; v0 = longueur
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #lbu évite l'extension de signe lors du chargement d'un caractère individuel.
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#a0 = heure d'été, a1 = src
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #Copiez d'abord, puis testez : cela copie également l'octet zéro de fin.
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
