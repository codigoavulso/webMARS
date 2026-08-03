#Exemple d'assistance multi-fichiers 2/2
#Entrée : $a0 = nombre dans [1 100]
#Sortie : $v0 = 1 si le nombre est premier, 0 sinon

.text
.globl is_prime
is_prime:
  #Par définition, les valeurs inférieures à 2 ne sont pas premières.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #Aucun diviseur supérieur à sqrt(n) ne doit être testé.
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div place le quotient en LO et le reste en HI.
  div $a0, $t1
  mfhi $t4
  beq $t4, $zero, prime_no
  nop

  addiu $t1, $t1, 1
  j prime_loop
  nop

prime_yes:
  li $v0, 1
  jr $ra
  nop

prime_no:
  move $v0, $zero
  jr $ra
  nop
