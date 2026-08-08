#다중 파일 예: 기본 모듈
#이 파일을 활성 상태로 유지하고 Assemble(어셈블)을 누르세요.
#아래의 .include 지시문은 다른 두 파일을 가져옵니다.
#- parity.asm은 숫자가 짝수인지 홀수인지 알려주는 메시지를 반환합니다.
#- prime.asm은 숫자가 소수인 경우 $v0에서 1을 반환합니다.
#
#흐름:
#1. [1,100]에 숫자를 요청하거나, 종료하려면 0을 입력하세요.
#2. 숫자가 짝수인지 홀수인지 출력하세요.
#3. 숫자가 소수인지 출력하세요.
#4. 반복

.data
#이 모듈은 사용자에게 표시되는 문자열을 소유합니다. 도우미 모듈은 개인 데이터/코드를 소유합니다.
title:         .asciiz "\n=== Multi-file number analyzer ===\n"
hint:          .asciiz "This example uses 3 separate files assembled together.\n"
prompt:        .asciiz "Enter a number [1..100] (0 to exit): "
invalid_msg:   .asciiz "Please enter a value between 1 and 100.\n"
result_prefix: .asciiz "Number "
parity_prefix: .asciiz " is "
prime_yes_msg: .asciiz " and it is prime.\n"
prime_no_msg:  .asciiz " and it is not prime.\n"
goodbye_msg:   .asciiz "Bye!\n"

.text
.globl main
main:
  li $v0, 4
  la $a0, title
  syscall

  li $v0, 4
  la $a0, hint
  syscall

input_loop:
  #Syscall 5는 $v0에 입력된 정수를 반환합니다.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #부호 있는 비교를 통해 하한과 상한을 검증합니다.
  slti $t0, $s0, 1
  bne $t0, $zero, invalid_input
  nop

  slti $t0, $s0, 101
  beq $t0, $zero, invalid_input
  nop

  li $v0, 4
  la $a0, result_prefix
  syscall

  li $v0, 1
  #o32 호출 규칙: $a0의 인수, $v0의 결과 포인터.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #두 번째 모듈은 $v0에서 부울을 반환합니다.
  move $a0, $s0
  jal get_parity_message
  nop

  move $s1, $v0
  li $v0, 4
  move $a0, $s1
  syscall

  move $a0, $s0
  jal is_prime
  nop

  bne $v0, $zero, print_prime_yes
  nop

  li $v0, 4
  la $a0, prime_no_msg
  syscall
  j input_loop
  nop

print_prime_yes:
  li $v0, 4
  la $a0, prime_yes_msg
  syscall
  j input_loop
  nop

invalid_input:
  li $v0, 4
  la $a0, invalid_msg
  syscall
  j input_loop
  nop

exit_program:
  li $v0, 4
  la $a0, goodbye_msg
  syscall

  li $v0, 10
  syscall

#포함은 어셈블리 중에 프로젝트 파일에서 확인됩니다.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
