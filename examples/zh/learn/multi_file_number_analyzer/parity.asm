#多文件示例助手 1/2
#输入：$a0 = 数字
#输出：$v0 =“偶数”或“奇数”消息的地址

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #偶数的最低有效位为 0，奇数的最低有效位为 1。
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #返回地址而不是在此处打印；调用者选择如何使用它。
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
