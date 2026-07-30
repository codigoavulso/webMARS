# Demo de utilitarios de strings: strlen + strcpy (manual)

.data
# Ambas as rotinas dependem do byte zero usado para terminar strings C.
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  # Na convenção o32, $a0 recebe o argumento e $v0 recebe o resultado.
  la   $a0, src
  jal  my_strlen
  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  # my_strcpy recebe destino em $a0 e origem em $a1.
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

# a0 = char* s ; v0 = comprimento
# Função-folha: percorre bytes sem alterar a memória nem chamar outra função.
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  # lbu evita extensão de sinal para carateres com o bit superior ativo.
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

# a0 = dst, a1 = src
# Copiar também o terminador garante que dst se torna uma string válida.
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
