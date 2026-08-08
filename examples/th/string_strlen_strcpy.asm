#การสาธิตยูทิลิตี้สตริง: strlen + strcpy (ด้วยตนเอง)
#รูทีนทั้งสองเดินทีละไบต์จนกระทั่งถึงจุดสิ้นสุดที่เป็นศูนย์
#เป็นฟังก์ชันลีฟ ดังนั้นจึงไม่จำเป็นต้องบันทึก $ra ลงในสแต็ก

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal เก็บที่อยู่ผู้ส่งไว้ใน $ra; ข้อโต้แย้ง/ผลลัพธ์เป็นไปตามการลงทะเบียน o32
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

#a0 = ถ่าน* s ; v0 = ความยาว
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #lbu หลีกเลี่ยงส่วนขยายเครื่องหมายเมื่อโหลดอักขระแต่ละตัว
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#a0 = เวลา, a1 = src
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #คัดลอกก่อน จากนั้นทดสอบ: นี่เป็นการคัดลอกศูนย์ไบต์ที่สิ้นสุดด้วย
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
