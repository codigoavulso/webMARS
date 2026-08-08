#Bàn phím và màn hình MMIO Bản trình diễn mô phỏng
#Mở Công cụ > Bàn phím và Hiển thị MMIO Trình mô phỏng
#Gõ vào khu vực bàn phím phía dưới; các ký tự được lặp lại ở khu vực hiển thị phía trên.

.data
msg0: .asciiz "\n=== Keyboard/Display MMIO demo ===\n"
msg1: .asciiz "Open Tools > Keyboard and Display MMIO Simulator and connect to MIPS.\n"
msg2: .asciiz "Typed characters will be echoed by MMIO transmitter.\n"

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

  lui $s0, 0xffff         #MMIO cơ sở 0xFFFF0000

mmio_loop:
  #chờ bộ thu bàn phím sẵn sàng (bit0 @ 0x0000)
wait_rx:
  lbu  $t0, 0x0000($s0)
  andi $t0, $t0, 1
  bne  $t0, $zero, receiver_ready
  nop
  li   $v0, 32             #hợp tác 4 ms chờ đã
  li   $a0, 4
  syscall
  b    wait_rx
  nop

receiver_ready:
  #đọc ký tự @ 0x0004
  lbu  $t1, 0x0004($s0)

  #chờ màn hình máy phát sẵn sàng (bit0 @ 0x0008)
wait_tx:
  lbu  $t2, 0x0008($s0)
  andi $t2, $t2, 1
  bne  $t2, $zero, transmitter_ready
  nop
  li   $v0, 32             #hợp tác 4 ms chờ đã
  li   $a0, 4
  syscall
  b    wait_tx
  nop

transmitter_ready:
  #viết char @ 0x000C
  sb   $t1, 0x000c($s0)

  j mmio_loop
