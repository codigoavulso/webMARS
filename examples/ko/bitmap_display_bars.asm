#비트맵 디스플레이 데모
#도구 > 비트맵 표시 열기
#프로그램은 단위 1x1, 디스플레이 64x64, 베이스 0x10010000를 설정합니다.
#색상이 변하는 움직이는 수평 막대를 그립니다.

.data
msg0: .asciiz "\n=== Bitmap Display demo ===\n"
msg1: .asciiz "Open Tools > Bitmap Display and connect to MIPS.\n"
msg2: .asciiz "Drawing animated color bars at 0x10010000...\n"

.text
main:
  li $t0, 0xffff0020      #webMARS 비트맵 MMIO 제어 블록
  li $t1, 0x57424d50      #"WBMP"
  sw $t1, 0($t0)
  li $t1, 1
  sw $t1, 4($t0)         #프로토콜 버전
  sw $t1, 8($t0)         #대상: 비트맵 표시
  li $t1, 64
  sw $t1, 12($t0)        #디스플레이 너비
  sw $t1, 16($t0)        #디스플레이 높이
  li $t1, 1
  sw $t1, 20($t0)        #단위 폭
  sw $t1, 24($t0)        #단위 높이
  li $t1, 0x10010000
  sw $t1, 28($t0)        #프레임버퍼
  li $t1, 1
  sw $t1, 32($t0)        #원자 적용

  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $s0, 0x1001         #프레임 버퍼 베이스 = 0x10010000
  li  $s1, 64             #폭
  li  $s2, 64             #신장
  li  $s3, 0              #프레임 인덱스

frame_loop:
  move $t0, $zero         #와이 = 0
row_loop:
  move $t1, $zero         #엑스 = 0
col_loop:
  #addr = 밑수 + ((y*64 + x) * 4)
  sll  $t2, $t0, 6        #y*64
  addu $t2, $t2, $t1      #y*64 + x
  sll  $t2, $t2, 2        # *4
  addu $t3, $s0, $t2

  #빌드 색상 0x00RRGGBB
  #R = (x + 프레임) & 255
  #G = (y*4) & 255
  #B = (x ^ y ^ 프레임) & 255
  addu $t4, $t1, $s3
  andi $t4, $t4, 0xff

  sll  $t5, $t0, 2
  andi $t5, $t5, 0xff

  xor  $t6, $t1, $t0
  xor  $t6, $t6, $s3
  andi $t6, $t6, 0xff

  sll  $t4, $t4, 16
  sll  $t5, $t5, 8
  or   $t7, $t4, $t5
  or   $t7, $t7, $t6

  sw   $t7, 0($t3)

  addiu $t1, $t1, 1
  blt   $t1, $s1, col_loop

  addiu $t0, $t0, 1
  blt   $t0, $s2, row_loop

  #30ms 수면
  li $v0, 32
  li $a0, 30
  syscall

  addiu $s3, $s3, 1
  j frame_loop
