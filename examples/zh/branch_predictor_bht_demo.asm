#BHT 模拟器演示的分支重循环
#打开工具 > BHT 模拟器并连接。

.data
msg0: .asciiz "\n=== Branch predictor demo ===\n"
msg1: .asciiz "Running mixed taken/not-taken branches...\n"
msg2: .asciiz "Done. Check precision in BHT Simulator.\n"

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall

  li $t0, 0
  li $t1, 2000
  li $s0, 0

branch_loop:
  #分支A：4次中取3次
  andi $t2, $t0, 3
  bne  $t2, $zero, taken_a
  addiu $s0, $s0, 1
  j after_a
taken_a:
  addiu $s0, $s0, 2
after_a:

  #分支 B：交替采取/不采取
  andi $t3, $t0, 1
  beq  $t3, $zero, taken_b
  addiu $s0, $s0, 3
  j after_b
taken_b:
  addiu $s0, $s0, 4
after_b:

  addiu $t0, $t0, 1
  blt  $t0, $t1, branch_loop

  li $v0, 4
  la $a0, msg2
  syscall

  li $v0, 10
  syscall
