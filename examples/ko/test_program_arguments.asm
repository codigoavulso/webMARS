#프로그램 인수 예.
#이 예제를 사용하여 MARS에서 argc/argv 지원을 테스트합니다.
#사용해 보시려면 설정 > MIPS 프로그램에 제공되는 프로그램 인수로 이동하세요.
#몇 가지 인수를 입력한 다음 프로그램을 어셈블하고 실행합니다.
#인수 예시: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #프로그램 인수에 대한 데모 프로그램입니다.
  #입장 시:
  #$a0 = 인수
  #$a1 = 인수
  move $s0, $a0          #argc를 저장합니다.
  move $s1, $a1          #argv를 저장하세요.

  #인수를 인쇄합니다.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #argv[i]를 반복합니다.
  li   $t0, 0            #나는 = 0

print_loop:
  beq  $t0, $s0, done

  li   $v0, 4
  la   $a0, argv_msg
  syscall

  li   $v0, 1
  move $a0, $t0
  syscall

  li   $v0, 4
  la   $a0, mid_msg
  syscall

  #argv는 포인터 배열이므로 argv[i]는 argv + i * 4에 있습니다.
  sll  $t1, $t0, 2       #오프셋 = i * 4
  addu $t2, $s1, $t1     #argv[i]의 주소
  lw   $a0, 0($t2)       #argv[i] 로드

  li   $v0, 4
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  addiu $t0, $t0, 1
  j    print_loop

done:
  li   $v0, 10
  syscall
