#Run I/O를 위한 Hello World
#간단한 메시지를 인쇄하고 종료합니다.
# 메시지는 .data에 속합니다. 이를 인쇄하는 지침은 .text에 속합니다.

.data
#.asciiz는 syscall 4에서 요구하는 0 종결자가 뒤에 오는 문자를 저장합니다.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #$v0에서 print-string (4)를 선택하고 $a0에 문자열 주소를 전달합니다.
  li $v0, 4
  la $a0, msg
  syscall

  #종료(10)는 시뮬레이션된 프로그램을 완전히 중지합니다.
  li $v0, 10
  syscall
