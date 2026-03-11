# Cache behavior demo (sequential vs strided access)
# Open Tools > Data Cache Simulation Tool and connect.
# This program first does sequential loads, then strided loads.

.data
arr: .space 4096          # 1024 words
msg0: .asciiz "\n=== Cache stride benchmark ===\n"
msg1: .asciiz "Phase 1: sequential read over 1024 words.\n"
msg2: .asciiz "Phase 2: stride-16 read pattern (cache-unfriendly).\n"
msg3: .asciiz "Done. Compare hit/miss stats in Cache Simulator.\n"

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall

  # Initialize arr[i] = i
  la   $t0, arr
  li   $t1, 0
init_loop:
  sw   $t1, 0($t0)
  addiu $t0, $t0, 4
  addiu $t1, $t1, 1
  blt  $t1, 1024, init_loop

  li $v0, 4
  la $a0, msg1
  syscall

  # Phase 1: sequential
  la   $t0, arr
  li   $t1, 0
  li   $s0, 0
seq_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, 1
  blt  $t1, 1024, seq_loop

  li $v0, 4
  la $a0, msg2
  syscall

  # Phase 2: stride 16 words (64 bytes)
  la   $t3, arr
  li   $t4, 0
  li   $s1, 0
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t8, 0($t7)
  addu $s1, $s1, $t8
  addiu $t5, $t5, 16
  blt  $t5, 1024, stride_inner

  addiu $t4, $t4, 1
  blt  $t4, 16, stride_outer

  li $v0, 4
  la $a0, msg3
  syscall

  li $v0, 10
  syscall
