#COP1 の算術デモ。
#二重ロード/ストア、算術演算、比較、分岐、および
#アクティブな FCSR 丸めモードを使用して 32 ビット整数に変換します。

.data
.align 3   #double には 8 バイトのアライメントが必要です
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
  ldc1  $f0, left   #double は偶数レジスタのペアを占有します
  ldc1  $f2, right
  add.d $f4, $f0, $f2   #算術演算は CPU ではなくコプロセッサーで実行されます。
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

  c.lt.d $f0, $f2   #比較ではフラグが書き込まれますが、分岐はしません
  bc1t   comparison_ok   #これはそのフラグを読み取るブランチです
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
  cvt.w.s $f8, $f6   #1.6 は FCSR 丸めモードを使用すると整数になります
  mfc1    $a0, $f8   #結果を CPU に戻して印刷します
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
