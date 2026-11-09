# 15 - ストライドによって速度が変わる理由
#
# 両方のループは同じ配列を使用します。 1 つ目は 256 単語すべてを読み取ります。 2 つ目は 16 ワードごとに読み取り、ロードは 16 回だけ行われます。
#
# 16 ワードのキャッシュ ブロックを使用すると、順次読み取りでフェッチされた各ブロックを再利用できます。 2 番目のループは、ロードするたびに新しいブロックに進みます。
#
# シミュレーターを MIPS に接続し、「有効」にチェックを入れて、ブロックサイズを16ワードに設定します。
# `far` にブレークポイントを指定して データキャッシュシミュレーター を使用して、最初のループを検査します。 2
# 番目のループを実行する前にキャッシュ統計をリセットし、ヒット率を比較します。

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# シーケンシャルパス: 全 256 ワード。
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #シーケンシャル インデックスは、次に進む前に各キャッシュ ブロックのワードを再利用します。
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# ストライドパス: 16 ワードごとに 1 回のロード。
        li   $t1, 0
        li   $t3, 0
far:
        # 次のアドレスは 64 バイト離れており、それぞれ 4 バイトの 16 ワードになります。
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
