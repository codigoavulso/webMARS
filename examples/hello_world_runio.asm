# Hello World for Run I/O
# Prints a simple message and exits.
# This is the smallest example of the data/text split and the syscall convention.

.data
# .asciiz stores the characters followed by the zero terminator required by syscall 4.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  # Select print-string (4) in $v0 and pass the string address in $a0.
  li $v0, 4
  la $a0, msg
  syscall

  # Exit (10) halts the simulated program cleanly.
  li $v0, 10
  syscall
