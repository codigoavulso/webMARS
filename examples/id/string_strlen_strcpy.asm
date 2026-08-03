#Demo utilitas string: strlen + strcpy (manual)
#Kedua rutin berjalan byte demi byte hingga terminator nol.
#Itu adalah fungsi daun, jadi tidak perlu menyimpan $ra di stack.

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal menyimpan alamat pengirim di $ra; argumen/hasil mengikuti register o32.
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

#a0 = karakter* s ; v0 = panjang
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #lbu menghindari ekstensi tanda saat memuat karakter individual.
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#a0 = dst, a1 = src
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #Salin dulu, lalu uji: ini juga menyalin byte nol yang terminasi.
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
