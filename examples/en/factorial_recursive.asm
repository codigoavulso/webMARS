# Recursive factorial (faculty classic)
# Reads n and prints n! (for small n).

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   # n is in $a0; the result comes back in $v0
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

# int fact(int n)
fact:
  addiu $sp, $sp, -8   # one frame per call: two words
  sw    $ra, 4($sp)   # save the return address before calling again
  sw    $a0, 0($sp)   # keep n: the recursive call overwrites $a0

  blez  $a0, fact_base   # stopping condition: without it the stack never unwinds
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   # our own n again, untouched by the call below
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   # restore and release the frame before returning
  addiu $sp, $sp, 8
  jr    $ra
