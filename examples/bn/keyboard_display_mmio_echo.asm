#কীবোর্ড এবং প্রদর্শন MMIO সিমুলেটর ডেমো
#টুল খুলুন > কীবোর্ড এবং প্রদর্শন MMIO সিমুলেটর
#নিম্ন কীবোর্ড এলাকায় টাইপ করুন; অক্ষর উপরের প্রদর্শন এলাকায় প্রতিধ্বনিত হয়.

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

  lui $s0, 0xffff         #MMIO ভিত্তি 0xFFFF0000

mmio_loop:
  #অপেক্ষা করুন কীবোর্ড রিসিভার প্রস্তুত (bit0 @ 0x0000)
wait_rx:
  lbu  $t0, 0x0000($s0)
  andi $t0, $t0, 1
  bne  $t0, $zero, receiver_ready
  nop
  li   $v0, 32             #সমবায় 4 ms অপেক্ষা করুন
  li   $a0, 4
  syscall
  b    wait_rx
  nop

receiver_ready:
  #চর পড়ুন @ 0x0004
  lbu  $t1, 0x0004($s0)

  #অপেক্ষা করুন ডিসপ্লে ট্রান্সমিটার প্রস্তুত (bit0 @ 0x0008)
wait_tx:
  lbu  $t2, 0x0008($s0)
  andi $t2, $t2, 1
  bne  $t2, $zero, transmitter_ready
  nop
  li   $v0, 32             #সমবায় 4 ms অপেক্ষা করুন
  li   $a0, 4
  syscall
  b    wait_tx
  nop

transmitter_ready:
  #চর @ 0x000C লিখুন
  sb   $t1, 0x000c($s0)

  j mmio_loop
