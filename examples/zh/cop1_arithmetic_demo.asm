#COP1算术演示。
#涵盖双重加载/存储、算术、比较、分支和
#使用有效的 FCSR 舍入模式转换为 32 位整数。

.data
.align 3   #双精度数需要八字节对齐
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
  ldc1  $f0, left   #double 占据偶数寄存器对
  ldc1  $f2, right
  add.d $f4, $f0, $f2   #算术在协处理器中运行，而不是在 CPU 中运行
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

  c.lt.d $f0, $f2   #比较写入一个标志，它不分支
  bc1t   comparison_ok   #这是读取该标志的分支
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
  cvt.w.s $f8, $f6   #1.6 使用 FCSR 舍入模式变成整数
  mfc1    $a0, $f8   #将结果返回到 CPU 进行打印
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
