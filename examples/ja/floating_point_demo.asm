#浮動小数点表現ツールの浮動小数点テスト
#IEEE-754 ビット パターンを $f12 に書き込み、浮動小数点値として出力します。

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #raw IEEE 754 ビット パターン (10 進数ではない)

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #32ビットパターンを整数として読み取ります
  mtc1 $t2, $f12   #同じビットを FPU に移動します: 変換は行われません

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 は $f12 を float として読み取って出力します
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #次のワード: 各パターンは 4 バイトを占有します
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
