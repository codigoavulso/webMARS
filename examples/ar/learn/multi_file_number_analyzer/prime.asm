#مساعد مثال متعدد الملفات 2/2
#الإدخال: $a0 = الرقم في [1,100]
#الإخراج: $v0 = 1 إذا كان الرقم أوليًا، و0 بخلاف ذلك

.text
.globl is_prime
is_prime:
  #بحكم التعريف، القيم أقل من 2 ليست أولية.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #لا يلزم اختبار أي مقسوم أكبر من sqrt(n).
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div يضع حاصل القسمة في LO والباقي في HI.
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
