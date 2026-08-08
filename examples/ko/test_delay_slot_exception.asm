#수동 패리티 테스트:
#지연 분기가 활성화되면 지연 슬롯에서 오버플로가 발생합니다.
#예상되는 동작:
#- 예외 메시지: 산술 오버플로
#- Cause.BD 세트
#- EPC는 beq 명령어를 가리킵니다.

.text
main:
  lui $t1, 0x7fff
  ori $t1, $t1, 0xffff
  ori $t2, $zero, 1
  beq $zero, $zero, done
  add $t0, $t1, $t2

done:
  ori $v0, $zero, 10
  syscall
