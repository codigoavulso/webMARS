# 02 - 2の補数
#
# 32 ビットの 2 の補数では、5 のビットを反転して 1 を加算すると、-5 の表現が生成されます。
#
# プログラムは同じ値を 2 つの方法で計算します: ゼロから `sub`、次に `nor` および `addi`。
#
# どちらのパスでも -5 が出力されます。レジスタ内の `0xFFFFFFFB` を調べて、同じビットが 16 進数でどのように見えるかを確認します。

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #ゼロから減算すると、マイナス符号ビットなしの加算逆元が形成されます。
        li   $t0, 5
        sub  $t1, $zero, $t0    #加算器が仕事をする
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #また、 $zero はビット単位の NOT です。 1 を追加すると 2 の補数が完成します。
        nor  $t2, $t0, $zero    #すべてのビットを反転する
        addi $t2, $t2, 1        #1つ追加します
        move $a0, $t2           #上記と同じ値
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
