#Przykład wielu plików: moduł główny
#Pozostaw ten plik aktywny i naciśnij Złóż.
#Poniższe dyrektywy .include pobierają pozostałe dwa pliki.
#- parity.asm zwraca komunikat informujący, czy liczba jest parzysta czy nieparzysta
#- prime.asm zwraca 1 w $v0, gdy liczba jest pierwsza
#
#Przepływ:
#1. Poproś o liczbę z zakresu [1100] lub 0, aby wyjść
#2. Wydrukuj, czy liczba jest parzysta czy nieparzysta
#3. Wydrukuj, czy liczba jest pierwsza
#4. Powtórz

.data
#Ten moduł posiada ciągi znaków widoczne dla użytkownika; moduły pomocnicze posiadają swoje prywatne dane/kod.
title:         .asciiz "\n=== Multi-file number analyzer ===\n"
hint:          .asciiz "This example uses 3 separate files assembled together.\n"
prompt:        .asciiz "Enter a number [1..100] (0 to exit): "
invalid_msg:   .asciiz "Please enter a value between 1 and 100.\n"
result_prefix: .asciiz "Number "
parity_prefix: .asciiz " is "
prime_yes_msg: .asciiz " and it is prime.\n"
prime_no_msg:  .asciiz " and it is not prime.\n"
goodbye_msg:   .asciiz "Bye!\n"

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
  #Syscall 5 zwraca wprowadzoną liczbę całkowitą w $v0.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #Zweryfikuj dolną i górną granicę za pomocą podpisanych porównań.
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
  #o32 konwencja wywołania: argument w $a0, wskaźnik wyniku w $v0.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #Drugi moduł zwraca wartość logiczną w $v0.
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

#Uwzględnienia są rozpoznawane na podstawie plików projektu podczas montażu.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
