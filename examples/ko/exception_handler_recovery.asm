#예외 처리기 데모를 복구하는 중입니다.
#정렬되지 않은 저장소는 주소 오류(저장소)를 발생시킵니다. 핸들러가 기록합니다.
#원인, EPC 및 BadVAddr은 오류가 있는 명령을 건너뛰고 ERET로 반환됩니다.

.data
recovered:     .asciiz "Recovered from the exception.\n"
cause_label:   .asciiz "Cause: "
epc_label:     .asciiz "EPC: "
badvaddr_label:.asciiz "BadVAddr: "
newline:       .asciiz "\n"
saved_cause:   .word 0
saved_epc:     .word 0
saved_badvaddr:.word 0

.text
main:
  li $t0, 0x12345678
  #주소 1은 워드로 정렬되지 않았으므로 이 명령어는 의도적으로 오류를 발생시킵니다.
  sw $t0, 1($zero)

  #핸들러가 EPC 명령을 한 단계 진행한 후 여기에서 실행이 다시 시작됩니다.
  li $v0, 4
  la $a0, recovered
  syscall

  la $a0, cause_label
  syscall
  lw $a0, saved_cause
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, epc_label
  syscall
  lw $a0, saved_epc
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, badvaddr_label
  syscall
  lw $a0, saved_badvaddr
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

.ktext 0x80000180
exception_handler:
  #CP0 레지스터 13 = 원인, 14 = EPC, 8 = BadVAddr.
  #커널 레지스터 $k0/$k1는 중단된 사용자 레지스터의 손상을 방지합니다.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #알려진 오류가 있는 4바이트 명령어를 건너뜁니다. 다시 시도하면 영원히 잘못될 것입니다.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
