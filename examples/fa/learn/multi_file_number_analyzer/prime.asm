#کمک کننده نمونه چند فایلی 2/2
#ورودی: $a0 = عدد در [1100]
#خروجی: $v0 = 1 اگر عدد اول باشد، 0 در غیر این صورت

.text
.globl is_prime
is_prime:
  #طبق تعریف، مقادیر زیر 2، اول نیستند.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #هیچ مقسوم علیه بزرگتر از sqrt(n) نیازی به آزمایش ندارد.
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div ضریب را در LO و بقیه را در HI قرار می دهد.
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
