# Ejemplo multiarchivo auxiliar 2/2
# Entrada: $a0 = numero en [1,100]
# Salida:  $v0 = 1 si el numero es primo, 0 en caso contrario

.text
.globl is_prime
is_prime:
  # Por definición, los valores menores que 2 no son primos.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  # No es necesario probar divisores mayores que sqrt(n).
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  # div deja el cociente en LO y el resto en HI.
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
