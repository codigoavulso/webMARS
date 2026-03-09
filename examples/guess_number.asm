# Guess the Number (1..100)
# Uses syscall 42 for random number generation and syscall 5 for integer input.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  # Seed random stream id=1 with an arbitrary seed.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  # Random integer in range [0,100), then shift to [1,100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  addiu $s0, $a0, 1      # secret number
  li $s1, 0              # attempts

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $t0, $v0          # guess
  addiu $s1, $s1, 1

  # if guess < secret => too low
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  # if secret < guess => too high
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  # equal => win
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
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
