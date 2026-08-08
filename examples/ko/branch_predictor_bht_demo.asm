#BHT 시뮬레이터 데모에 대한 분기가 많은 루프
#도구 > BHT 시뮬레이터를 열고 연결합니다.

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
  #지점 A: 4번 중 3번 가져옴
  andi $t2, $t0, 3
  bne  $t2, $zero, taken_a
  addiu $s0, $s0, 1
  j after_a
taken_a:
  addiu $s0, $s0, 2
after_a:

  #지점 B: 촬영/취하지 않음이 번갈아 표시됨
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
