# Hello World para Run I/O
# Imprime uma mensagem simples e termina.
# É o exemplo mínimo da separação data/text e da convenção de syscalls.

.data
# .asciiz reserva também o byte zero que termina a string.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  # Convenção das syscalls: $v0 escolhe o serviço e $a0 recebe o argumento.
  li $v0, 4
  la $a0, msg
  syscall

  # Terminar explicitamente evita avançar para memória sem instruções.
  li $v0, 10
  syscall
