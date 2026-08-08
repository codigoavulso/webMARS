#แฟกทอเรียลแบบเรียกซ้ำ (คณาจารย์คลาสสิก)
#อ่าน n และพิมพ์ n! (สำหรับตัวเล็ก n)

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n อยู่ใน $a0; ผลลัพธ์จะกลับมาใน $v0
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#ข้อเท็จจริงที่แท้จริง (int n)
fact:
  addiu $sp, $sp, -8   #หนึ่งเฟรมต่อการโทร: สองคำ
  sw    $ra, 4($sp)   #บันทึกที่อยู่ผู้ส่งก่อนโทรอีกครั้ง
  sw    $a0, 0($sp)   #เก็บ n: การโทรซ้ำจะเขียนทับ $a0

  blez  $a0, fact_base   #เงื่อนไขการหยุด: หากไม่มีมัน สแต็กจะไม่คลี่คลาย
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #ของเราเองอีกครั้ง โดยไม่ถูกแตะต้องโดยการโทรด้านล่าง
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #คืนค่าและปล่อยเฟรมก่อนส่งคืน
  addiu $sp, $sp, 8
  jr    $ra
