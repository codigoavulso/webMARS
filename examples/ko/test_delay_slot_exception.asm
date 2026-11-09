# 원인 및 EPC를 검사하여 CPU가 지연 슬롯에 예외를 기록하는 방법을 확인하세요.
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
