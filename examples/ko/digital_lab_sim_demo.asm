#디지털 랩 시뮬레이션 테스트
#도구 매핑(기본값 MMIO 기본 0xFFFF0000):
#오른쪽 숫자 표시: 0xFFFF0010
#왼쪽 숫자 표시 : 0xFFFF0011
#키보드 Ctrl : 0xFFFF0012
#키보드 출력 코드 : 0xFFFF0014
#
#Digital Lab Sim 키패드에서 키를 클릭하세요.
#프로그램은 스캔 코드를 해독하고 누른 키 값(0..f)을 표시합니다.

.data
msg0:   .asciiz "\n=== Digital Lab Sim demo ===\n"
msg1:   .asciiz "Open Tools > Digital Lab Sim and click keypad buttons.\n"
msg2:   .asciiz "Displaying pressed key value (0..f) on 7-segment.\n"
segmap: .byte 0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f,0x77,0x7c,0x39,0x5e,0x79,0x71

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

  lui $t0, 0xffff
  li $t1, 0x0f
  sb $t1, 0x12($t0)      #모든 행을 스캔

  sb $zero, 0x11($t0)    #왼쪽 자리 공백
  move $s1, $zero        #마지막으로 처리된 스캔 코드

wait_key:
  lbu $t2, 0x14($t0)     #키보드 스캔 코드(col<<4 | 행)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #협조적 4ms 대기
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #행 비트(낮은 니블) 및 열 비트(높은 니블)
  andi $t3, $t2, 0x0f    #행비트: 1,2,4,8
  srl  $t4, $t2, 4       #콜비트: 1,2,4,8

  #행 인덱스 = log2(rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #열 인덱스 = log2(colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #키 니블 = 행*4 + 열(값 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #누른 키를 오른쪽 숫자에 표시

  j wait_key

#a0: 니블 0..15
#v0: 7세그먼트 패턴
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
