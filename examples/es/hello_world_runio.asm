# Hello World para Run I/O
# Imprime un mensaje simple y termina.
# El mensaje va en .data y las instrucciones que lo imprimen van en .text.

.data
# .asciiz guarda los caracteres y el cero final que necesita la syscall 4.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  # Seleccionar print-string (4) en $v0 y pasar la dirección en $a0.
  li $v0, 4
  la $a0, msg
  syscall

  # Exit (10) detiene limpiamente el programa simulado.
  li $v0, 10
  syscall
