#캐시 동작 벤치마크: 순차 액세스와 스트라이드 16 액세스 비교.
#도구 > 데이터 캐시 시뮬레이션 도구를 열고 MIPS에 연결한 후 활성화됨을 선택합니다.
#
#각 실행은 정확히 하나의 콜드 캐시 패턴을 측정합니다. ACCESS_PATTERN 설정
#1 또는 2로 설정하고 시뮬레이터 통계를 재설정한 다음 다시 조립하고 실행하세요.
#두 패턴 모두 1024 로드를 수행합니다. 초기화 쓰기가 없으면 데이터가 오염됩니다.

.eqv ACCESS_PATTERN 1    #1 = 순차, 2 = 스트라이드 16단어
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #패턴 1: 순차적 주소.
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #패턴 2: 16번째 단어마다 방문하고 시작 오프셋을 전진시킵니다.
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
