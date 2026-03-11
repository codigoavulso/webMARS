# Manual parity test for Settings > Initialize Program Counter to global 'main' if defined.
# Expected behavior:
# - with startAtMain disabled: prints PRELUDE
# - with startAtMain enabled: prints MAIN

.data
prelude_msg: .asciiz "PRELUDE\n"
main_msg:    .asciiz "MAIN\n"

.text
entry:
  ori $v0, $zero, 4
  la $a0, prelude_msg
  syscall
  ori $v0, $zero, 10
  syscall

main:
  ori $v0, $zero, 4
  la $a0, main_msg
  syscall
  ori $v0, $zero, 10
  syscall
