#猜数字 (1..100)
#使用系统调用 42 进行随机数生成，使用系统调用 5 进行整数输入。
#$s0 跨系统调用保守秘密； $s1 计算循环迭代的尝试次数。

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #使用任意种子为随机流 id=1 提供种子。
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #[0,100) 范围内的随机整数，然后移至 [1,100]。
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #系统调用 42 在 $a0 中返回生成的值，而不是在 $v0 中。
  addiu $s0, $a0, 1      #秘密号码
  li $s1, 0              #尝试

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #系统调用可能会覆盖参数/结果寄存器，因此持久状态保留在 $s 寄存器中。
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #整数输入在 $v0 中返回。
  move $t0, $v0          #猜测
  addiu $s1, $s1, 1

  #如果猜测<秘密=>太低
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #如果秘密<猜测=>太高
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #平等=>获胜
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #两个反馈分支都在下一次迭代中收敛。
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
