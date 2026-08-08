#Kiểm tra Sim phòng thí nghiệm kỹ thuật số
#Ánh xạ công cụ (với cơ sở MMIO mặc định 0xFFFF0000):
#hiển thị chữ số bên phải: 0xFFFF0010
#hiển thị chữ số bên trái: 0xFFFF0011
#ctrl bàn phím: 0xFFFF0012
#mã tắt bàn phím: 0xFFFF0014
#
#Bấm vào các phím trong bàn phím Digital Lab Sim.
#Chương trình giải mã mã quét và hiển thị giá trị phím được nhấn (0..f).

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
  sb $t1, 0x12($t0)      #quét tất cả các hàng

  sb $zero, 0x11($t0)    #trống chữ số bên trái
  move $s1, $zero        #mã quét được xử lý lần cuối

wait_key:
  lbu $t2, 0x14($t0)     #mã quét bàn phím (col<<4 | row)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #hợp tác 4 ms chờ đã
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #bit hàng (nibble thấp) và bit cột (nibble cao)
  andi $t3, $t2, 0x0f    #hàngBit: 1,2,4,8
  srl  $t4, $t2, 4       #colBit: 1,2,4,8

  #chỉ số hàng = log2(rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #chỉ số col = log2(colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #khóa nibble = row*4 + col (giá trị 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #hiển thị phím được nhấn ở chữ số bên phải

  j wait_key

#a0: nhấm nháp 0..15
#v0: mẫu bảy đoạn
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
