#문자열 유틸리티 데모: strlen + strcpy(수동)
#두 루틴 모두 0 종료자가 나올 때까지 바이트 단위로 진행됩니다.
#이는 리프 함수이므로 스택에 $ra를 저장할 필요가 없습니다.

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal은 반환 주소를 $ra에 저장합니다. 인수/결과는 o32 레지스터를 따릅니다.
  la   $a0, src
  jal  my_strlen
  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  la   $a0, dst
  la   $a1, src
  jal  my_strcpy

  li $v0, 4
  la $a0, msg1
  syscall

  li $v0, 4
  la $a0, dst
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#a0 = 문자* 초 ; v0 = 길이
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #lbu는 개별 문자를 로드할 때 기호 확장을 방지합니다.
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#a0 = dst, a1 = src
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #먼저 복사한 다음 테스트하세요. 종료되는 0바이트도 복사됩니다.
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
