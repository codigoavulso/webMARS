#다중 파일 예제 도우미 2/2
#입력: $a0 = [1,100]의 숫자
#출력: $v0 = 숫자가 소수이면 1, 그렇지 않으면 0

.text
.globl is_prime
is_prime:
  #정의에 따르면 2 미만의 값은 소수가 아닙니다.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #sqrt(n)보다 큰 제수는 테스트할 필요가 없습니다.
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div는 몫을 LO에 배치하고 나머지를 HI에 배치합니다.
  div $a0, $t1
  mfhi $t4
  beq $t4, $zero, prime_no
  nop

  addiu $t1, $t1, 1
  j prime_loop
  nop

prime_yes:
  li $v0, 1
  jr $ra
  nop

prime_no:
  move $v0, $zero
  jr $ra
  nop
