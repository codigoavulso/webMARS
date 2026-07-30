# Adivina el Numero (1..100)
# Usa la syscall 42 para generar aleatorios y la syscall 5 para leer enteros.
# $s0 conserva el secreto entre syscalls; $s1 cuenta intentos entre iteraciones.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  # Inicializar la secuencia aleatoria id=1 con una semilla arbitraria.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  # Entero aleatorio en el rango [0,100), y luego desplazado a [1,100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  # La syscall 42 devuelve el valor generado en $a0, no en $v0.
  addiu $s0, $a0, 1      # numero secreto
  li $s1, 0              # intentos

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  # Las syscalls pueden sobrescribir argumentos/resultados; el estado persistente usa $s.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  # La entrada entera se devuelve en $v0.
  move $t0, $v0          # intento
  addiu $s1, $s1, 1

  # si intento < secreto => demasiado bajo
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  # si secreto < intento => demasiado alto
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  # igual => gana
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
  # Las dos ramas de ayuda convergen en la siguiente iteración.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
