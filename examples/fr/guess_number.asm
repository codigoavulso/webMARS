#Devinez le nombre (1..100)
#Utilise l'appel système 42 pour la génération de nombres aléatoires et l'appel système 5 pour la saisie d'entiers.
#$s0 garde le secret lors des appels système ; $s1 compte les tentatives à travers les itérations de boucle.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #Seed random stream id=1 avec une graine arbitraire.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #Entier aléatoire dans la plage [0,100), puis passage à [1,100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 renvoie la valeur générée dans $a0, pas dans $v0.
  addiu $s0, $a0, 1      #numéro secret
  li $s1, 0              #tentatives

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Les appels système peuvent écraser les registres d'arguments/résultats, de sorte que l'état persistant reste dans les registres $s.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #L'entrée entière est renvoyée dans $v0.
  move $t0, $v0          #devine
  addiu $s1, $s1, 1

  #si devinez < secret => trop bas
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #si secret < deviner => trop élevé
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #égal => gagner
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
  #Les deux branches de rétroaction convergent vers l’itération suivante.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
