#Beispielhelfer für mehrere Dateien 2/2
#Eingabe: $a0 = Zahl in [1.100]
#Ausgabe: $v0 = 1, wenn die Zahl eine Primzahl ist, andernfalls 0

.text
.globl is_prime
is_prime:
  #Per Definition sind Werte unter 2 keine Primzahlen.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #Es muss kein Teiler größer als sqrt(n) getestet werden.
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div setzt den Quotienten in LO und den Rest in HI.
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
