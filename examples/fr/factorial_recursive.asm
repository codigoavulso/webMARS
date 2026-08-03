#Factorielle récursive (classique de la faculté)
#Lit n et imprime n ! (pour le petit n).

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n est dans $a0 ; le résultat revient dans $v0
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#int fait(int n)
fact:
  addiu $sp, $sp, -8   #une image par appel : deux mots
  sw    $ra, 4($sp)   #enregistrez l'adresse de retour avant de rappeler
  sw    $a0, 0($sp)   #keep n : l'appel récursif écrase $a0

  blez  $a0, fact_base   #condition d'arrêt : sans elle, la pile ne se déroule jamais
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #notre propre n à nouveau, épargné par l'appel ci-dessous
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #restaurer et libérer le cadre avant de revenir
  addiu $sp, $sp, 8
  jr    $ra
