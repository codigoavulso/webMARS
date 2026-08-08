#재귀 계승(교수 클래식)
#n을 읽고 n을 인쇄합니다! (작은 n의 경우).

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n은 $a0에 있습니다. 결과는 $v0로 돌아옵니다.
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#int 사실(int n)
fact:
  addiu $sp, $sp, -8   #호출당 하나의 프레임: 두 단어
  sw    $ra, 4($sp)   #다시 전화하기 전에 반송 주소를 저장해 두세요
  sw    $a0, 0($sp)   #n 유지: 재귀 호출이 $a0를 덮어씁니다.

  blez  $a0, fact_base   #중지 조건: 이것이 없으면 스택은 풀리지 않습니다.
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #아래 호출의 영향을 받지 않고 다시 우리 자신의 n
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #반환하기 전에 프레임을 복원하고 해제하십시오.
  addiu $sp, $sp, 8
  jr    $ra
