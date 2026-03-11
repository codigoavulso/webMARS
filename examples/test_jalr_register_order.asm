# Manual parity test for jalr rd, rs.
# Expected behavior after run:
# - $s0 contains the link address 0x0040000c
# - $t0 becomes 7 inside target
# - $t3 becomes 9 after returning through $s0

.text
main:
  lui $t1, 0x0040
  ori $t1, $t1, 0x0018
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
