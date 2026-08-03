#Многофайловый пример помощника 2/2
#Ввод: $a0 = число из [1100]
#Вывод: $v0 = 1, если число простое, 0 в противном случае.

.text
.globl is_prime
is_prime:
  #По определению, значения ниже 2 не являются простыми.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #Никакой делитель, больший sqrt(n), проверять не нужно.
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div помещает частное в LO, а остаток в HI.
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
