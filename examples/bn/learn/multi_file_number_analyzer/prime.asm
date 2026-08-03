#মাল্টি-ফাইল উদাহরণ সহকারী 2/2
#ইনপুট: $a0 = [1,100] এ সংখ্যা
#আউটপুট: $v0 = 1 যদি সংখ্যাটি মৌলিক হয়, অন্যথায় 0

.text
.globl is_prime
is_prime:
  #সংজ্ঞা অনুসারে, 2 এর নিচের মানগুলি মৌলিক নয়।
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #sqrt(n) এর চেয়ে বড় কোন ভাজক পরীক্ষা করার দরকার নেই।
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div ভাগফলকে LO-তে এবং অবশিষ্টাংশ HI-তে রাখে।
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
