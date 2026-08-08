#숫자 추측하기 (1..100)
#난수 생성에는 syscall 42를 사용하고 정수 입력에는 syscall 5를 사용합니다.
#$s0 syscall 전체에서 비밀을 유지합니다. $s1는 루프 반복 전반에 걸친 시도를 계산합니다.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #임의의 시드가 있는 시드 랜덤 스트림 ID=1입니다.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #[0,100] 범위의 임의 정수를 선택한 다음 [1,100]으로 이동합니다.
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  # Syscall 42는 생성된 값을 다음과 같이 반환합니다. $a0, 안 $v0.
  addiu $s0, $a0, 1      #비밀번호
  li $s1, 0              #시도

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Syscall은 인수/결과 레지스터를 덮어쓸 수 있으므로 영구 상태는 $s 레지스터에 유지됩니다.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #정수 입력은 $v0에 반환됩니다.
  move $t0, $v0          #추측하다
  addiu $s1, $s1, 1

  #추측 < 비밀 => 너무 낮은 경우
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #비밀 < 추측 => 너무 높은 경우
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #동등 => 승리
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #두 피드백 분기 모두 다음 반복에서 수렴됩니다.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
