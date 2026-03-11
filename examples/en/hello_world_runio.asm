# Hello World for Run I/O
# Prints a simple message and exits.

.data
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  li $v0, 4
  la $a0, msg
  syscall

  li $v0, 10
  syscall
