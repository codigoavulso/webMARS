#Многофайловый пример: основной модуль
#Оставьте этот файл активным и нажмите «Собрать».
#Директивы .include, приведенные ниже, подключают два других файла.
#- parity.asm возвращает сообщение о том, является ли число четным или нечетным
#- prime.asm возвращает 1 в $v0, когда число простое
#
#Поток:
#1. Для выхода запросите число из [1100] или 0.
#2. Выведите, является ли число четным или нечетным.
#3. Выведите, является ли число простым.
#4. Повторите

.data
#Этот модуль владеет строками, доступными пользователю; Вспомогательные модули владеют своими личными данными/кодом.
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
  #Системный вызов 5 возвращает введенное целое число в $v0.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #Подтвердите нижнюю и верхнюю границы с помощью знакового сравнения.
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
  #Соглашение о вызове o32: аргумент в $a0, указатель результата в $v0.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #Второй модуль возвращает логическое значение в формате $v0.
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

#Включения разрешаются из файлов проекта во время сборки.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
