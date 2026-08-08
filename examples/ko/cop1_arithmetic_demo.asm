#COP1 산술 데모.
#이중 로드/저장, 산술, 비교, 분기 및
#활성 FCSR 반올림 모드를 사용하여 32비트 정수로 변환합니다.

.data
.align 3   #복식에는 8바이트 정렬이 필요합니다.
left:          .double 1.5
right:         .double 2.25
stored_sum:    .space 8
round_source:  .float 1.6
sum_label:     .asciiz "1.5 + 2.25 = "
compare_true:  .asciiz "1.5 is less than 2.25\n"
compare_false: .asciiz "Unexpected comparison result\n"
round_label:   .asciiz "1.6 rounded with the default FCSR mode = "
newline:       .asciiz "\n"

.text
main:
  ldc1  $f0, left   #double은 짝수 레지스터 쌍을 차지합니다.
  ldc1  $f2, right
  add.d $f4, $f0, $f2   #연산은 CPU가 아닌 보조 프로세서에서 실행됩니다.
  sdc1  $f4, stored_sum

  li    $v0, 4
  la    $a0, sum_label
  syscall
  mov.d $f12, $f4
  li    $v0, 3
  syscall
  li    $v0, 4
  la    $a0, newline
  syscall

  c.lt.d $f0, $f2   #비교는 플래그를 작성하지만 분기되지는 않습니다.
  bc1t   comparison_ok   #이것은 해당 플래그를 읽는 분기입니다.
  nop
  la     $a0, compare_false
  b      print_comparison
  nop
comparison_ok:
  la     $a0, compare_true
print_comparison:
  li     $v0, 4
  syscall

  lwc1    $f6, round_source
  cvt.w.s $f8, $f6   #1.6은 FCSR 반올림 모드를 사용하여 정수가 됩니다.
  mfc1    $a0, $f8   #결과를 CPU로 다시 가져와서 인쇄하세요.
  li      $v0, 4
  la      $a0, round_label
  syscall
  mfc1    $a0, $f8
  li      $v0, 1
  syscall
  li      $v0, 4
  la      $a0, newline
  syscall

  li $v0, 10
  syscall
