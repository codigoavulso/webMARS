#의사 연산 감소를 위한 수동 패리티 테스트입니다.
#실행 후 결과에서 데이터 세그먼트를 검사합니다.
#결과[0] = 1 시퀀스 5,5
#결과[1] = 1단계 5,5
#결과[2] = 5 절대값 -5
#결과[3] = 0xfffffffa 5가 아님

.data
results: .word 0, 0, 0, 0

.text
main:
  ori $t0, $zero, 5
  ori $t1, $zero, 5
  addiu $t2, $zero, -5

  seq $s0, $t0, $t1
  sge $s1, $t0, $t1
  abs $s2, $t2
  not $s3, $t0

  lui $t4, 0x1001
  ori $t4, $t4, 0x0000
  sw $s0, 0($t4)
  sw $s1, 4($t4)
  sw $s2, 8($t4)
  sw $s3, 12($t4)

  ori $v0, $zero, 10
  syscall
