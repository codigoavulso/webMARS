# Adivinha o Numero (1..100)
# Usa a syscall 42 para gerar aleatorios e a syscall 5 para ler inteiros.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  # Inicializar a stream aleatoria id=1 com uma seed arbitraria.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  # Inteiro aleatorio no intervalo [0,100), depois deslocado para [1,100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  addiu $s0, $a0, 1      # numero secreto
  li $s1, 0              # tentativas

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $t0, $v0          # palpite
  addiu $s1, $s1, 1

  # se palpite < segredo => demasiado baixo
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  # se segredo < palpite => demasiado alto
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  # igual => venceu
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
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
