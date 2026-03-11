# Hello World para Run I/O
# Imprime un mensaje simple y termina.

.data
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  li $v0, 4
  la $a0, msg
  syscall

  li $v0, 10
  syscall
