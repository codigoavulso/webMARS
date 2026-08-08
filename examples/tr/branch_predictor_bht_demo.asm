#BHT Simülatör demosu için dal ağırlıklı döngü
#Araçlar > BHT Simülatörünü açın ve bağlanın.

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
  #A şubesi: 4 defadan 3'ü alındı
  andi $t2, $t0, 3
  bne  $t2, $zero, taken_a
  addiu $s0, $s0, 1
  j after_a
taken_a:
  addiu $s0, $s0, 2
after_a:

  #B şubesi: alternatif alınan/alınmayan
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
