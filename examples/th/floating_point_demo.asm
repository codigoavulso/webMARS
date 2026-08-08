#การทดสอบจุดลอยตัวสำหรับเครื่องมือการแสดงจุดลอยตัว
#เขียนรูปแบบ IEEE-754 บิตลงใน $f12 และพิมพ์เป็นค่าทศนิยม

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #raw IEEE รูปแบบ 754 บิต ไม่ใช่เลขทศนิยม

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #อ่านรูปแบบ 32 บิตเป็นจำนวนเต็ม
  mtc1 $t2, $f12   #ย้ายบิตเดียวกันไปที่ FPU: ไม่มีการแปลงเกิดขึ้น

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 พิมพ์ $f12 อ่านเป็นแบบทศนิยม
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #คำถัดไป: แต่ละรูปแบบใช้พื้นที่สี่ไบต์
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
