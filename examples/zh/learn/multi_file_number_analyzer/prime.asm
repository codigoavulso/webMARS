#多文件示例助手 2/2
#输入：$a0 = [1,100] 中的数字
#输出：如果数字是质数，则 $v0 = 1，否则为 0

.text
.globl is_prime
is_prime:
  #根据定义，低于 2 的值不是素数。
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #不需要测试大于 sqrt(n) 的除数。
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div 将商放入 LO，将余数放入 HI。
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
