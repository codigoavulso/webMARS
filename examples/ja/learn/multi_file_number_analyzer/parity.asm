#複数ファイルのサンプルヘルパー 1/2
#入力: $a0 = 数値
#出力: $v0 = 「偶数」または「奇数」メッセージのアドレス

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #最下位ビットは偶数の場合は 0、奇数の場合は 1 です。
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #ここに印刷するのではなく、住所を返します。呼び出し側がそれを使用する方法を選択します。
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
