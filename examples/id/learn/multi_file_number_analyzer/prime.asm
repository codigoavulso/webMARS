#Contoh pembantu multi-file 2/2
#Input: $a0 = angka dalam [1,100]
#Output: $v0 = 1 jika bilangan prima, 0 jika tidak

.text
.globl is_prime
is_prime:
  #Menurut definisinya, nilai di bawah 2 bukanlah bilangan prima.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #Tidak ada pembagi yang lebih besar dari kuadrat(n) yang perlu diuji.
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div menempatkan hasil bagi di LO dan sisanya di HI.
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
