#字符串实用程序演示：strlen + strcpy（手动）
#两个例程都逐字节运行，直到零终止符。
#它们是叶函数，因此不需要在堆栈上保存 $ra。

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal 将返回地址存储在 $ra 中；参数/结果遵循 o32 寄存器。
  la   $a0, src
  jal  my_strlen
  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  la   $a0, dst
  la   $a1, src
  jal  my_strcpy

  li $v0, 4
  la $a0, msg1
  syscall

  li $v0, 4
  la $a0, dst
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#a0 = 字符 * s ； v0 = 长度
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #lbu 在加载单个字符时避免符号扩展。
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#a0 = 目标，a1 = 源
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #先复制，然后测试：这也会复制终止零字节。
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
