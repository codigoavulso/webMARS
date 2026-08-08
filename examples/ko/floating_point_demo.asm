#부동 소수점 표현 도구에 대한 부동 소수점 테스트
#IEEE-754 비트 패턴을 $f12에 쓰고 부동 소수점 값으로 인쇄합니다.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #raw IEEE 754 비트 패턴, 십진수가 아님

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #32비트 패턴을 정수로 읽습니다.
  mtc1 $t2, $f12   #동일한 비트를 FPU로 이동합니다. 변환이 발생하지 않습니다.

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2는 $f12를 부동 소수점으로 인쇄합니다.
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #다음 단어: 각 패턴은 4바이트를 차지합니다.
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
