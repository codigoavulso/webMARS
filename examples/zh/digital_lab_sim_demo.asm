#数字实验室模拟测试
#工具映射（使用默认 MMIO 基础 0xFFFF0000）：
#显示右侧数字：0xFFFF0010
#显示左侧数字：0xFFFF0011
#键盘 ctrl : 0xFFFF0012
#键盘输出代码：0xFFFF0014
#
#单击 Digital Lab Sim 键盘上的按键。
#程序解码扫描码并显示按下的键值（0..f）。

.data
msg0:   .asciiz "\n=== Digital Lab Sim demo ===\n"
msg1:   .asciiz "Open Tools > Digital Lab Sim and click keypad buttons.\n"
msg2:   .asciiz "Displaying pressed key value (0..f) on 7-segment.\n"
segmap: .byte 0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f,0x77,0x7c,0x39,0x5e,0x79,0x71

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $t0, 0xffff
  li $t1, 0x0f
  sb $t1, 0x12($t0)      #扫描所有行

  sb $zero, 0x11($t0)    #左边数字空白
  move $s1, $zero        #最后处理的扫描码

wait_key:
  lbu $t2, 0x14($t0)     #键盘扫描码（列<<4 | 行）
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #合作 4 毫秒等待
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #行位（低半字节）和列位（高半字节）
  andi $t3, $t2, 0x0f    #行位：1,2,4,8
  srl  $t4, $t2, 4       #列位：1,2,4,8

  #行索引 = log2(rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #列索引 = log2(colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #键半字节 = 行*4 + 列（值 0..15）
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #在右侧数字上显示按下的键

  j wait_key

#a0: 半字节 0..15
#v0：七段模式
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
