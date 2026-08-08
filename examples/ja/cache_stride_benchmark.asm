#キャッシュ動作ベンチマーク: シーケンシャル アクセスとストライド 16 アクセス。
#[ツール] > [データ キャッシュ シミュレーション ツール] を開き、MIPS に接続して、[有効] をチェックします。
#
#各実行では、正確に 1 つのコールド キャッシュ パターンが測定されます。 ACCESS_PATTERN を設定します
#1 または 2 に設定し、シミュレータ統計をリセットしてから、再度アセンブルして実行します。
#どちらのパターンも 1024 回のロードを実行します。初期化書き込みを行わないとデータが汚染されます。

.eqv ACCESS_PATTERN 1    #1 = シーケンシャル、2 = ストライド 16 ワード
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

  #パターン 1: 連続したアドレス。
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

  #パターン 2: 16 ワードごとにアクセスし、開始オフセットを進めます。
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
