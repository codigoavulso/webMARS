# 3x3 matrix multiplication (C = A * B)

.data
A: .word 1,2,3, 4,5,6, 7,8,9
B: .word 9,8,7, 6,5,4, 3,2,1
C: .space 36
sep: .asciiz " "
row: .asciiz "\n"
msg: .asciiz "C matrix:\n"

.text
main:
  la $s0, A
  la $s1, B
  la $s2, C

  li $t0, 0              # i
for_i:
  bge $t0, 3, print
  li $t1, 0              # j
for_j:
  bge $t1, 3, next_i

  li $t2, 0              # k
  li $t3, 0              # sum
for_k:
  bge $t2, 3, store

  # A[i][k]
  mul $t4, $t0, 3
  addu $t4, $t4, $t2
  sll $t4, $t4, 2
  addu $t5, $s0, $t4
  lw  $t6, 0($t5)

  # B[k][j]
  mul $t7, $t2, 3
  addu $t7, $t7, $t1
  sll $t7, $t7, 2
  addu $t8, $s1, $t7
  lw  $t9, 0($t8)

  mul  $t4, $t6, $t9
  addu $t3, $t3, $t4

  addiu $t2, $t2, 1
  j for_k

store:
  mul $t4, $t0, 3
  addu $t4, $t4, $t1
  sll $t4, $t4, 2
  addu $t5, $s2, $t4
  sw  $t3, 0($t5)

  addiu $t1, $t1, 1
  j for_j

next_i:
  addiu $t0, $t0, 1
  j for_i

print:
  li $v0, 4
  la $a0, msg
  syscall

  li $t0, 0
p_i:
  bge $t0, 3, done
  li $t1, 0
p_j:
  bge $t1, 3, p_next_i
  mul $t4, $t0, 3
  addu $t4, $t4, $t1
  sll $t4, $t4, 2
  addu $t5, $s2, $t4
  lw  $a0, 0($t5)
  li  $v0, 1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addiu $t1, $t1, 1
  j p_j

p_next_i:
  li $v0, 4
  la $a0, row
  syscall
  addiu $t0, $t0, 1
  j p_i

done:
  li $v0, 10
  syscall
