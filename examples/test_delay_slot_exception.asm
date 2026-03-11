# Manual parity test:
# With delayed branching enabled, the overflow happens in the delay slot.
# Expected behavior:
# - exception message: arithmetic overflow
# - Cause.BD set
# - EPC points to the beq instruction

.text
main:
  lui $t1, 0x7fff
  ori $t1, $t1, 0xffff
  ori $t2, $zero, 1
  beq $zero, $zero, done
  add $t0, $t1, $t2

done:
  ori $v0, $zero, 10
  syscall
