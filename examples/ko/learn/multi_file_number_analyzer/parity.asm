#다중 파일 예제 도우미 1/2
#입력: $a0 = 숫자
#출력: $v0 = "짝수" 또는 "홀수" 메시지의 주소

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #최하위 비트는 짝수의 경우 0이고 홀수의 경우 1입니다.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #여기에 인쇄하는 대신 주소를 반환하세요. 발신자가 사용 방법을 선택합니다.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
