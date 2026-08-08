#키보드 및 디스플레이 MMIO 시뮬레이터 데모
#도구 > 키보드 및 디스플레이 MMIO 시뮬레이터 열기
#아래쪽 키보드 영역에 입력합니다. 문자는 상단 디스플레이 영역에 에코됩니다.

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

  lui $s0, 0xffff         #MMIO 베이스 0xFFFF0000

mmio_loop:
  #키보드 수신기 준비 대기(bit0 @ 0x0000)
wait_rx:
  lbu  $t0, 0x0000($s0)
  andi $t0, $t0, 1
  bne  $t0, $zero, receiver_ready
  nop
  li   $v0, 32             #협조적 4ms 대기
  li   $a0, 4
  syscall
  b    wait_rx
  nop

receiver_ready:
  #문자 읽기 @ 0x0004
  lbu  $t1, 0x0004($s0)

  #대기 디스플레이 송신기 준비(bit0 @ 0x0008)
wait_tx:
  lbu  $t2, 0x0008($s0)
  andi $t2, $t2, 1
  bne  $t2, $zero, transmitter_ready
  nop
  li   $v0, 32             #협조적 4ms 대기
  li   $a0, 4
  syscall
  b    wait_tx
  nop

transmitter_ready:
  #char @ 0x000C 쓰기
  sb   $t1, 0x000c($s0)

  j mmio_loop
