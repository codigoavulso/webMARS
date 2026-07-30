# Exemplo multi-ficheiro auxiliar 2/2
# Entrada: $a0 = numero em [1,100]
# Saida:   $v0 = 1 se o numero e primo, 0 caso contrario

.text
.globl is_prime
is_prime:
  # Por definição, valores inferiores a 2 não são primos.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  # Basta testar divisores enquanto divisor² <= número.
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  # div coloca o resto em HI; resto zero significa que foi encontrado um divisor.
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
