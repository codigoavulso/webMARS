# Manual parity test for jalr rd, rs.
# Expected behavior after run:
# - delayed branching off: $s0 contains 0x0040000c
# - delayed branching on:  $s0 contains 0x00400010
# - $t0 becomes 7 inside target
# - $t3 becomes 9 after returning through $s0

.text
main:
  la $t1, target
  jalr $s0, $t1
  ori $t3, $zero, 9
  j done
  nop

target:
  ori $t0, $zero, 7
  jr $s0
  nop

done:
  ori $v0, $zero, 10
  syscall
