# 07 - 記憶の中の言葉
#
# メモリアドレスはバイト数をカウントします。各ワードは 4 バイトを占めるため、`lw` と `sw` はここでオフセット 0、4、8 を使用します。
#
# ワードアドレスは 4 の倍数でなければなりません。オフセット 4 の代わりに 1 を使用すると、このプログラムで位置合わせ例外が発生します。
#
# ストアの後に、データ セグメントの `cell` を見てください。隣接する 3 つの単語には 111、222、および 333 が含まれている必要があります。

        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #ベースアドレス

        #以下のすべてのオフセットは $t0 に相対しており、ワード位置に揃えられています。
        li   $t1, 111
        sw   $t1, 0($t0)        #最初の言葉
        li   $t1, 222
        sw   $t1, 4($t0)        #+4バイト = 次のワード
        li   $t1, 333
        sw   $t1, 8($t0)        #+8バイト

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw は、sw によって以前に書き込まれた同じ 32 ビット値を再構築します。
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
