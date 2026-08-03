#Рекурсивный факториал (факультетская классика)
#Читает и печатает! (для малых n).

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n находится в $a0; результат возвращается в $v0
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#int факт(int n)
fact:
  addiu $sp, $sp, -8   #один кадр на звонок: два слова
  sw    $ra, 4($sp)   #сохраните обратный адрес, прежде чем звонить снова
  sw    $a0, 0($sp)   #держите: рекурсивный вызов перезаписывает $a0

  blez  $a0, fact_base   #условие остановки: без него стек никогда не раскручивается
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #снова наш собственный, нетронутый звонком ниже
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #восстановить и отпустить кадр перед возвращением
  addiu $sp, $sp, 8
  jr    $ra
