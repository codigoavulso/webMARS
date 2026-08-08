#Indovina il numero (1..100)
#Utilizza la syscall 42 per la generazione di numeri casuali e la syscall 5 per l'input di numeri interi.
#$s0 mantiene il segreto tra le chiamate di sistema; $s1 conta i tentativi tra le iterazioni del ciclo.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #Semina id flusso casuale = 1 con un seme arbitrario.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #Intero casuale nell'intervallo [0,100), quindi passa a [1,100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 restituisce il valore generato in $a0, non in $v0.
  addiu $s0, $a0, 1      #numero segreto
  li $s1, 0              #tentativi

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Le chiamate di sistema possono sovrascrivere i registri degli argomenti/risultati, quindi lo stato persistente rimane nei registri $s.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #L'input intero viene restituito in $v0.
  move $t0, $v0          #indovina
  addiu $s1, $s1, 1

  #se indovina <segreto => troppo basso
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #se segreto < indovina => troppo alto
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #uguale => vincere
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
  #Entrambi i rami di feedback convergono alla successiva iterazione.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
