#webMARS Bản demo ngắt đồng hồ hệ thống
#Mở Công cụ > Đồng hồ và bộ hẹn giờ hệ thống, kết nối nó với MIPS, lắp ráp và chạy.
#Một bộ đếm thời gian mô phỏng xác định sẽ ngắt chương trình sau mỗi 200 lệnh.

.eqv CLOCK_CONTROL 0xffff0050   #các thanh ghi thiết bị trực tiếp trong khối MMIO
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #khoảng thời gian được đo trong các lệnh được thực hiện, do đó quá trình chạy lặp lại chính xác
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #bit 0 khởi động bộ đếm thời gian, bit 1 cho phép nó tăng các ngắt
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main không bao giờ gọi trình xử lý: CPU tự nhảy tới nó
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #dừng đồng hồ trước khi kết thúc
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
