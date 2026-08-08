#Bản demo tiện ích chuỗi: strlen + strcpy (thủ công)
#Cả hai quy trình đều đi từng byte cho đến khi kết thúc bằng 0.
#Chúng là các hàm lá nên không cần lưu $ra vào ngăn xếp.

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal lưu trữ địa chỉ trả lại trong $ra; đối số/kết quả theo thanh ghi o32.
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

#a0 = char* s ; v0 = chiều dài
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #lbu tránh phần mở rộng dấu khi tải một ký tự riêng lẻ.
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
  #Sao chép trước, sau đó kiểm tra: thao tác này cũng sao chép byte 0 kết thúc.
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
