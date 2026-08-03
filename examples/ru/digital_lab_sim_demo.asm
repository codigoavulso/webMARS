#Тест Digital Lab Sim
#Сопоставление инструментов (с базой по умолчанию MMIO 0xFFFF0000):
#отобразить правую цифру: 0xFFFF0010
#отобразить левую цифру: 0xFFFF0011
#Ctrl : 0xFFFF0012
#код выхода с клавиатуры: 0xFFFF0014
#
#Нажимайте клавиши на клавиатуре Digital Lab Sim.
#Программа декодирует скан-код и отображает значение нажатой клавиши (0..f).

.data
msg0:   .asciiz "\n=== Digital Lab Sim demo ===\n"
msg1:   .asciiz "Open Tools > Digital Lab Sim and click keypad buttons.\n"
msg2:   .asciiz "Displaying pressed key value (0..f) on 7-segment.\n"
segmap: .byte 0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f,0x77,0x7c,0x39,0x5e,0x79,0x71

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $t0, 0xffff
  li $t1, 0x0f
  sb $t1, 0x12($t0)      #сканировать все строки

  sb $zero, 0x11($t0)    #левая цифра пустая
  move $s1, $zero        #последний обработанный скан-код

wait_key:
  lbu $t2, 0x14($t0)     #код сканирования клавиатуры (столбец<<4 | строка)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #кооператив ожидание 4 мс
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #бит строки (младший полубайт) и бит столбца (старший полубайт)
  andi $t3, $t2, 0x0f    #строкабит: 1,2,4,8
  srl  $t4, $t2, 4       #колБит: 1,2,4,8

  #индекс строки = log2(rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #индекс столбца = log2 (colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #полубайт ключа = строка*4 + столбец (значения 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #показывать нажатую клавишу на правой цифре

  j wait_key

#a0: полубайт 0..15
#v0: семисегментный шаблон
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
