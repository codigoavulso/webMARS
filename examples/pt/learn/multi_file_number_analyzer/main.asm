# Exemplo multi-ficheiro: modulo principal
# Mantenha este ficheiro ativo e prima Assemble.
# As diretivas .include abaixo trazem os outros dois ficheiros.
# - parity.asm devolve uma mensagem a indicar se o numero e par ou impar
# - prime.asm devolve 1 em $v0 quando o numero e primo
#
# Fluxo:
# 1. Pedir um numero em [1,100], ou 0 para sair
# 2. Mostrar se o numero e par ou impar
# 3. Mostrar se o numero e primo
# 4. Repetir

.data
title:         .asciiz "\n=== Analisador multi-ficheiro de numeros ===\n"
hint:          .asciiz "Este exemplo usa 3 ficheiros separados montados em conjunto.\n"
prompt:        .asciiz "Introduza um numero [1..100] (0 para sair): "
invalid_msg:   .asciiz "Introduza um valor entre 1 e 100.\n"
result_prefix: .asciiz "O numero "
parity_prefix: .asciiz " e "
prime_yes_msg: .asciiz " e primo.\n"
prime_no_msg:  .asciiz " e nao e primo.\n"
goodbye_msg:   .asciiz "Ate breve!\n"

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
