#ScavengerHunt 플레이어 메모리 데모.
#도구 > ScavengerHunt를 열고 MIPS에 연결한 후 이 프로그램을 실행하세요.
#플레이어 0은 위치, 에너지 및 색상이 변경된 상태에서 수평으로 이동합니다.
#도구의 메모리 매핑 프로토콜을 통해 통신됩니다.

.eqv PLAYER0_BASE 0xffff8000
.eqv GAME_ON_ADDR 0xffffe008
.eqv TURNS_ADDR   0xffffe00c

.text
main:
  li $s0, PLAYER0_BASE
  li $s1, 40
  li $s2, 200
  li $s3, 3
  li $s4, 20
  li $s5, 3000
  li $s6, 0x00ff5a36

  li $t0, GAME_ON_ADDR
  li $t1, 1
  sw $t1, 0($t0)
  li $s7, TURNS_ADDR

move_loop:
  sw $s1, 0x00($s0)
  sw $s2, 0x04($s0)
  sw $s4, 0x14($s0)
  sw $s6, 0x1c($s0)
  sw $s5, 0($s7)

  li $v0, 32
  li $a0, 30
  syscall

  addu  $s1, $s1, $s3
  addiu $s5, $s5, -1
  blez  $s5, done
  nop
  bgt   $s1, 650, move_left
  nop
  blt   $s1, 40, move_right
  nop
  b     move_loop
  nop

move_left:
  li $s3, -3
  b  move_loop
  nop

move_right:
  li $s3, 3
  b  move_loop
  nop

done:
  sw $zero, 0($s7)
  li $v0, 10
  syscall
