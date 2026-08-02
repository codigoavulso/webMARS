# Demo de aritmetica COP1.
# Abrange loads/stores double, aritmetica, comparacao, branching e
# conversao para inteiro de 32 bits com o modo de arredondamento do FCSR.

.data
.align 3   # os doubles exigem alinhamento a oito bytes
left:          .double 1.5
right:         .double 2.25
stored_sum:    .space 8
round_source:  .float 1.6
sum_label:     .asciiz "1.5 + 2.25 = "
compare_true:  .asciiz "1.5 e menor do que 2.25\n"
compare_false: .asciiz "Resultado de comparacao inesperado\n"
round_label:   .asciiz "1.6 arredondado com o modo FCSR predefinido = "
newline:       .asciiz "\n"

.text
main:
  ldc1  $f0, left   # um double ocupa um par de registos pares
  ldc1  $f2, right
  add.d $f4, $f0, $f2   # a aritmética corre no coprocessador, não na CPU
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

  c.lt.d $f0, $f2   # a comparação escreve uma flag, não desvia
  bc1t   comparison_ok   # este é o desvio que lê essa flag
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
  cvt.w.s $f8, $f6   # 1,6 passa a inteiro segundo o modo de arredondamento do FCSR
  mfc1    $a0, $f8   # trazer o resultado de volta à CPU para o imprimir
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
