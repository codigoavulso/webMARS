#Тест с плавающей запятой для инструмента «Представление с плавающей запятой»
#Записывает IEEE-754 битовых шаблона в $f12 и печатает их как значения с плавающей запятой.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #необработанный IEEE 754-битный шаблон, а не десятичные числа

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #прочитать 32-битный шаблон как целое число
  mtc1 $t2, $f12   #переместите те же биты в FPU: преобразования не происходит.

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 печатает $f12 читается как число с плавающей запятой
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #следующее слово: каждый шаблон занимает четыре байта
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
