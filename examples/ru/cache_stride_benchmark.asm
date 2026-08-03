#Тест поведения кэша: последовательный доступ по сравнению с доступом с шагом 16.
#Откройте «Инструменты» > «Инструмент моделирования кэша данных», подключите его к MIPS и установите флажок «Включено».
#
#Каждое выполнение измеряет ровно один шаблон холодного кэша. Установить ACCESS_PATTERN
#на 1 или 2, сбросьте статистику симулятора, затем соберите и запустите снова.
#Оба шаблона выполняют 1024 нагрузки; никакие записи инициализации не загрязняют данные.

.eqv ACCESS_PATTERN 1    #1 = последовательный, 2 = шаг 16 слов
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #Схема 1: последовательные адреса.
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #Схема 2: посетите каждое 16-е слово, затем увеличьте начальное смещение.
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
