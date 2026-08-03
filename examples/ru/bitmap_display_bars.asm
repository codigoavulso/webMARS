#Демо-версия растрового отображения
#Откройте «Инструменты» > «Отображение растрового изображения».
#Программа устанавливает Unit 1x1, Display 64x64, Base 0x10010000.
#Рисует движущуюся горизонтальную полосу с меняющимися цветами.

.data
msg0: .asciiz "\n=== Bitmap Display demo ===\n"
msg1: .asciiz "Open Tools > Bitmap Display and connect to MIPS.\n"
msg2: .asciiz "Drawing animated color bars at 0x10010000...\n"

.text
main:
  li $t0, 0xffff0020      #webMARS Битовый блок управления MMIO
  li $t1, 0x57424d50      #"WBMP"
  sw $t1, 0($t0)
  li $t1, 1
  sw $t1, 4($t0)         #версия протокола
  sw $t1, 8($t0)         #цель: Растровое отображение
  li $t1, 64
  sw $t1, 12($t0)        #ширина дисплея
  sw $t1, 16($t0)        #высота дисплея
  li $t1, 1
  sw $t1, 20($t0)        #ширина устройства
  sw $t1, 24($t0)        #высота единицы
  li $t1, 0x10010000
  sw $t1, 28($t0)        #кадровый буфер
  li $t1, 1
  sw $t1, 32($t0)        #атомарное применение

  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $s0, 0x1001         #база кадрового буфера = 0x10010000
  li  $s1, 64             #ширина
  li  $s2, 64             #высота
  li  $s3, 0              #индекс кадра

frame_loop:
  move $t0, $zero         #у = 0
row_loop:
  move $t1, $zero         #х = 0
col_loop:
  #адрес = база + ((y*64 + x) * 4)
  sll  $t2, $t0, 6        #у*64
  addu $t2, $t2, $t1      #у*64 + х
  sll  $t2, $t2, 2        # *4
  addu $t3, $s0, $t2

  #Цвет сборки 0x00RRGGBB
  #R = (х + рамка) & 255
  #Г = (у*4) & 255
  #B = (x ^ y ^ кадр) & 255
  addu $t4, $t1, $s3
  andi $t4, $t4, 0xff

  sll  $t5, $t0, 2
  andi $t5, $t5, 0xff

  xor  $t6, $t1, $t0
  xor  $t6, $t6, $s3
  andi $t6, $t6, 0xff

  sll  $t4, $t4, 16
  sll  $t5, $t5, 8
  or   $t7, $t4, $t5
  or   $t7, $t7, $t6

  sw   $t7, 0($t3)

  addiu $t1, $t1, 1
  blt   $t1, $s1, col_loop

  addiu $t0, $t0, 1
  blt   $t0, $s2, row_loop

  #сон 30 мс
  li $v0, 32
  li $a0, 30
  syscall

  addiu $s3, $s3, 1
  j frame_loop
