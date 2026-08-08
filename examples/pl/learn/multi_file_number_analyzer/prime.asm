#Przykładowy pomocnik wieloplikowy 2/2
#Wejście: $a0 = liczba w [1100]
#Wynik: $v0 = 1, jeśli liczba jest liczbą pierwszą, 0 w przeciwnym razie

.text
.globl is_prime
is_prime:
  #Z definicji wartości poniżej 2 nie są liczbami pierwszymi.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #Nie trzeba testować żadnego dzielnika większego niż sqrt(n).
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div umieszcza iloraz w LO, a resztę w HI.
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
