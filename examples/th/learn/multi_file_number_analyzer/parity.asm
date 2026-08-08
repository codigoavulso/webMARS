#ตัวช่วยตัวอย่างหลายไฟล์ 1/2
#อินพุต: $a0 = ตัวเลข
#เอาท์พุต: $v0 = ที่อยู่ของข้อความ "คู่" หรือ "คี่"

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #บิตที่มีนัยสำคัญน้อยที่สุดคือ 0 สำหรับเลขคู่ และ 1 สำหรับเลขคี่
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #ส่งคืนที่อยู่แทนที่จะพิมพ์ที่นี่ ผู้โทรจะเลือกวิธีใช้งาน
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
