#Kiểm tra dấu phẩy động cho công cụ Biểu diễn dấu phẩy động
#Ghi các mẫu bit IEEE-754 vào $f12 và in chúng dưới dạng giá trị float.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #raw IEEE mẫu 754 bit, không phải số thập phân

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #đọc mẫu 32 bit dưới dạng số nguyên
  mtc1 $t2, $f12   #di chuyển các bit tương tự vào FPU: không có chuyển đổi nào xảy ra

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 in $f12 đọc dưới dạng float
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #từ tiếp theo: mỗi mẫu chiếm bốn byte
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
