#Демонстрация строковых утилит: strlen + strcpy (вручную)
#Обе процедуры проходят побайтно до нулевого терминатора.
#Это конечные функции, поэтому им не нужно сохранять $ra в стеке.

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal сохраняет обратный адрес в $ra; аргументы/результаты следуют за регистрами o32.
  la   $a0, src
  jal  my_strlen
  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  la   $a0, dst
  la   $a1, src
  jal  my_strcpy

  li $v0, 4
  la $a0, msg1
  syscall

  li $v0, 4
  la $a0, dst
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#а0 = символ* с; v0 = длина
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #lbu избегает расширения знака при загрузке отдельного символа.
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#a0 = dst, a1 = источник
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #Сначала скопируйте, затем проверьте: при этом также копируется завершающий нулевой байт.
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
