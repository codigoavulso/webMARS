#มาตรฐานพฤติกรรมแคช: การเข้าถึงตามลำดับเทียบกับ stride-16
#เปิดเครื่องมือ > เครื่องมือจำลองแคชข้อมูล เชื่อมต่อกับ MIPS และทำเครื่องหมายที่เปิดใช้งาน
#
#การดำเนินการแต่ละครั้งจะวัดรูปแบบ Cold Cache หนึ่งรูปแบบเท่านั้น ตั้งค่า ACCESS_PATTERN
#เป็น 1 หรือ 2 รีเซ็ตสถิติตัวจำลอง จากนั้นประกอบและรันอีกครั้ง
#ทั้งสองรูปแบบทำการโหลดได้ 1,024 ครั้ง ไม่มีการเขียนเริ่มต้นทำให้ข้อมูลเสียหาย

.eqv ACCESS_PATTERN 1    #1 = ลำดับ 2 = ก้าวย่าง 16 คำ
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #รูปแบบที่ 1: ที่อยู่ตามลำดับ
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #รูปแบบที่ 2: ไปที่ทุกๆ คำที่ 16 จากนั้นเลื่อนออฟเซ็ตเริ่มต้นไปข้างหน้า
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
