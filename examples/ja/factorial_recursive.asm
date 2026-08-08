#再帰階乗 (学部の古典)
#n を読み取り、n を出力します! (小さい n の場合)。

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n は $a0 にあります。結果は $v0 で返されます。
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#int 事実(int n)
fact:
  addiu $sp, $sp, -8   #呼び出しごとに 1 フレーム: 2 ワード
  sw    $ra, 4($sp)   #再度電話をかける前に返信先アドレスを保存してください
  sw    $a0, 0($sp)   #keep n: 再帰呼び出しは $a0 を上書きします

  blez  $a0, fact_base   #停止条件: それがないとスタックは決して巻き戻されません
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #私たち自身の n が再び、下の呼び出しの影響を受けません
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #戻る前にフレームを復元して解放します
  addiu $sp, $sp, 8
  jr    $ra
