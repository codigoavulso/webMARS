#バブルソートのデモ
#固定配列をソートし、ソートされた値を出力します。
#概念: インデックス付きワード アクセス、ネストされたループ、符号付き比較、およびインプレース スワップ。
#登録プラン: $s0 = 配列ベース、$s1 = 長さ、$t0/$t1 = ループ インデックス。

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #私は
outer:
  #パス i の後、i 個の最大値はすでに右端に固定されています。
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #1 ワードは 4 バイトを占めるため、arr[j] は Base + j*4 になります。
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #隣接する値の順序が狂っています。メモリ内で値を交換します。
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #システムコール 4 は、要素ごとの走査の前にラベルを印刷します。
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #同じアドレス計算を再利用して arr[index] を取得します。
  bge $t7, $s1, end
  sll $t3, $t7, 2
  addu $t4, $s0, $t3
  lw  $a0, 0($t4)
  li  $v0, 1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addiu $t7, $t7, 1
  j print_loop

end:
  li $v0, 11
  li $a0, '\n'
  syscall
  li $v0, 10
  syscall
