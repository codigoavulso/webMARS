# Ejemplo multiarchivo: modulo principal
# Mantenga este fichero activo y pulse Assemble.
# Las directivas .include de abajo traen los otros dos ficheros.
# - parity.asm devuelve un mensaje que indica si el numero es par o impar
# - prime.asm devuelve 1 en $v0 cuando el numero es primo
#
# Flujo:
# 1. Pedir un numero en [1,100], o 0 para salir
# 2. Mostrar si el numero es par o impar
# 3. Mostrar si el numero es primo
# 4. Repetir

.data
title:         .asciiz "\n=== Analizador multiarchivo de numeros ===\n"
hint:          .asciiz "Este ejemplo usa 3 ficheros separados ensamblados juntos.\n"
prompt:        .asciiz "Introduzca un numero [1..100] (0 para salir): "
invalid_msg:   .asciiz "Introduzca un valor entre 1 y 100.\n"
result_prefix: .asciiz "El numero "
parity_prefix: .asciiz " es "
prime_yes_msg: .asciiz " y es primo.\n"
prime_no_msg:  .asciiz " y no es primo.\n"
goodbye_msg:   .asciiz "Hasta luego!\n"

.text
.globl main
main:
  li $v0, 4
  la $a0, title
  syscall

  li $v0, 4
  la $a0, hint
  syscall

input_loop:
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  slti $t0, $s0, 1
  bne $t0, $zero, invalid_input
  nop

  slti $t0, $s0, 101
  beq $t0, $zero, invalid_input
  nop

  li $v0, 4
  la $a0, result_prefix
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  move $a0, $s0
  jal get_parity_message
  nop

  move $s1, $v0
  li $v0, 4
  move $a0, $s1
  syscall

  move $a0, $s0
  jal is_prime
  nop

  bne $v0, $zero, print_prime_yes
  nop

  li $v0, 4
  la $a0, prime_no_msg
  syscall
  j input_loop
  nop

print_prime_yes:
  li $v0, 4
  la $a0, prime_yes_msg
  syscall
  j input_loop
  nop

invalid_input:
  li $v0, 4
  la $a0, invalid_msg
  syscall
  j input_loop
  nop

exit_program:
  li $v0, 4
  la $a0, goodbye_msg
  syscall

  li $v0, 10
  syscall

.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
