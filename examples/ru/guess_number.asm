#Угадай число (1..100)
#Использует системный вызов 42 для генерации случайных чисел и системный вызов 5 для целочисленного ввода.
#$s0 сохраняет секрет при всех системных вызовах; $s1 подсчитывает попытки на всех итерациях цикла.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #Начальный случайный поток с идентификатором = 1 с произвольным начальным числом.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #Случайное целое число в диапазоне [0,100), затем сдвиг на [1100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Системный вызов 42 возвращает сгенерированное значение в $a0, а не в $v0.
  addiu $s0, $a0, 1      #секретный номер
  li $s1, 0              #попытки

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Системные вызовы могут перезаписывать регистры аргументов/результатов, поэтому постоянное состояние остается в регистрах $s.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #Целочисленный ввод возвращается в виде $v0.
  move $t0, $v0          #догадайся
  addiu $s1, $s1, 1

  #если предположение <секрет => слишком низкое
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #если секрет <угадай => слишком высокий
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #равно => победа
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #Обе ветви обратной связи сходятся на следующей итерации.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
