#Демонстрация вызова функций в стиле C
#Имитирует общий пролог/эпилог и локальные переменные в стеке.

.data
msg0: .asciiz "Result sumSquares(3,7) = "

.text
main:
  li   $a0, 3
  li   $a1, 7
  jal  sumSquares

  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#int sumSquares (int x, int y) {
#интервал sx = х*х;
#int sy = y*y;
#вернуть х + си;
# }
sumSquares:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $fp, 16($sp)
  move  $fp, $sp

  sw    $a0, 0($fp)      #х местный
  sw    $a1, 4($fp)      #местный

  lw    $t0, 0($fp)
  mul   $t1, $t0, $t0
  sw    $t1, 8($fp)      #sx местный

  lw    $t2, 4($fp)
  mul   $t3, $t2, $t2
  sw    $t3, 12($fp)     #си местный

  addu  $v0, $t1, $t3

  lw    $fp, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
