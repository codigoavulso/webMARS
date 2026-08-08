#로드 시 주소 오류에 대한 수동 패리티 테스트입니다.
#예상되는 동작:
#- 0x10010001에서 로드 예외가 발생했습니다.
#- 잘못된 주소 / vaddr에 0x10010001이 표시됨

.data
value: .word 0x12345678

.text
main:
  lui $t0, 0x1001
  ori $t0, $t0, 0x0001
  lw $t1, 0($t0)
  ori $v0, $zero, 10
  syscall
