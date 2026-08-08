#webMARS การสาธิตการขัดจังหวะนาฬิการะบบ
#เปิด Tools > System Clock and Timer เชื่อมต่อกับ MIPS ประกอบและรัน
#ตัวจับเวลาจำลองที่กำหนดจะขัดจังหวะโปรแกรมทุกๆ 200 คำสั่ง

.eqv CLOCK_CONTROL 0xffff0050   #อุปกรณ์ลงทะเบียนอยู่ในบล็อก MMIO
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #ระยะเวลาวัดตามคำสั่งที่ดำเนินการ ดังนั้นการรันจึงเกิดขึ้นซ้ำทุกประการ
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #บิต 0 เริ่มจับเวลา บิต 1 ปล่อยให้มันเพิ่มการขัดจังหวะ
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main ไม่เคยเรียกตัวจัดการ: CPU กระโดดไปหามันเอง
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #หยุดจับเวลาก่อนที่จะเสร็จสิ้น
  li $v0, 4
  la $a0, message
  syscall
  li $v0, 1
  move $a0, $t2
  syscall
  li $v0, 11
  li $a0, 10
  syscall
  li $v0, 10
  syscall
.ktext 0x80000180
timer_handler:
  mfc0 $k0, $13
  andi $k0, $k0, 0x0400
  beq $k0, $zero, handler_done
  nop
  la $k1, ticks
  lw $k0, 0($k1)
  addiu $k0, $k0, 1
  sw $k0, 0($k1)
handler_done:
  eret
