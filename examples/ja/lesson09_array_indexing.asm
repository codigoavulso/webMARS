# 09 - 配列のインデックス付け
#
# 各配列要素は 4 バイトを占めます。インデックスを左に 2 シフトして、バイト オフセットを計算します。
#
# `sll`、`add`、`lw` のシーケンスに従います。インデックスをスケールし、ベースアドレスを追加し、要素をロードします。
#
# インデックス 2 では、`$t5` は 8、`$t6` は値 30 を指します。5 つの要素を合計すると 150 になります。

        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #ベース
        li   $t1, 0             #私は
        li   $t2, 5             #長さ
        li   $t3, 0             #アキュムレータ

sum:
        #ループ不変式: $t3 は arr[0] から arr[i-1] までの合計です。
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #i * 4バイト
        add  $t6, $t0, $t5      #ベース + スケーリングされたインデックス
        #$t6 は 1 つの要素にのみ名前を付けるようになりました。 lw は 32 ビット値を取得します。
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
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
