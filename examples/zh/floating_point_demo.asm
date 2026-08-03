#浮点表示工具的浮点测试
#将 IEEE-754 位模式写入 $f12 并将其打印为浮点值。

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #原始 IEEE 754 位模式，不是十进制数

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #将 32 位模式读取为整数
  mtc1 $t2, $f12   #将相同的位移入 FPU：不发生转换

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #系统调用 2 打印 $f12 读取为浮点数
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #下一个字：每个模式占用四个字节
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
