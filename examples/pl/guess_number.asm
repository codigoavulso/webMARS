#Zgadnij liczbę (1..100)
#Używa syscall 42 do generowania liczb losowych i syscall 5 do wprowadzania liczb całkowitych.
#$s0 utrzymuje tajemnicę podczas wywołań systemowych; $s1 zlicza próby w iteracjach pętli.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #Identyfikator losowego strumienia początkowego = 1 z dowolnym ziarnem.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #Losowa liczba całkowita z zakresu [0,100), następnie przesuń do [1,100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 zwraca wygenerowaną wartość w $a0, a nie w $v0.
  addiu $s0, $a0, 1      #tajny numer
  li $s1, 0              #próby

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Wywołania systemowe mogą nadpisać rejestry argumentów/wyników, więc trwały stan pozostaje w rejestrach $s.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #Wartość całkowita jest zwracana w $v0.
  move $t0, $v0          #zgadnij
  addiu $s1, $s1, 1

  #jeśli zgadnij <sekret => za nisko
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #jeśli sekret < zgadnij => za wysoki
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #równy => wygrany
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
  #Obie gałęzie sprzężenia zwrotnego zbiegają się w następnej iteracji.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
