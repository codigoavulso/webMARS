#การทดสอบซิมแล็บดิจิทัล
#การแมปเครื่องมือ (ด้วยค่าเริ่มต้น MMIO ฐาน 0xFFFF0000):
#แสดงหลักขวา: 0xFFFF0010
#แสดงหลักซ้าย : 0xFFFF0011
#แป้นพิมพ์ Ctrl : 0xFFFF0012
#รหัสออกของแป้นพิมพ์ : 0xFFFF0014
#
#คลิกปุ่มในแผงปุ่มกด Digital Lab Sim
#โปรแกรมถอดรหัสรหัสสแกนและแสดงค่าคีย์ที่กด (0..f)

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
  sb $t1, 0x12($t0)      #สแกนทุกแถว

  sb $zero, 0x11($t0)    #ตัวเลขซ้ายว่าง
  move $s1, $zero        #รหัสสแกนที่ประมวลผลครั้งล่าสุด

wait_key:
  lbu $t2, 0x14($t0)     #รหัสสแกนแป้นพิมพ์ (col<<4 | แถว)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #สหกรณ์ รอ 4 มิลลิวินาที
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #บิตแถว (แทะต่ำ) และบิตคอลัมน์ (แทะสูง)
  andi $t3, $t2, 0x0f    #แถวบิต: 1,2,4,8
  srl  $t4, $t2, 4       #คอลบิต: 1,2,4,8

  #ดัชนีแถว = log2 (rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #ดัชนีคอล = log2 (colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #key nibble = row*4 + col (ค่า 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #แสดงปุ่มกดที่หลักขวา

  j wait_key

#a0: แทะ 0..15
#v0: รูปแบบเจ็ดส่วน
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
