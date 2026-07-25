# Demo de aritmetica COP1.
# Incluye loads/stores double, aritmetica, comparacion, branching y
# conversion a entero de 32 bits con el modo de redondeo activo del FCSR.

.data
.align 3
left:          .double 1.5
right:         .double 2.25
stored_sum:    .space 8
round_source:  .float 1.6
sum_label:     .asciiz "1.5 + 2.25 = "
compare_true:  .asciiz "1.5 es menor que 2.25\n"
compare_false: .asciiz "Resultado de comparacion inesperado\n"
round_label:   .asciiz "1.6 redondeado con el modo FCSR predeterminado = "
newline:       .asciiz "\n"

.text
main:
  ldc1  $f0, left
  ldc1  $f2, right
  add.d $f4, $f0, $f2
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

  c.lt.d $f0, $f2
  bc1t   comparison_ok
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
  cvt.w.s $f8, $f6
  mfc1    $a0, $f8
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
