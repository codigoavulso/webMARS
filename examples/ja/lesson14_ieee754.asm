# 14 - 32 ビットの実数
#
# 単精度浮動小数点には、1 つの符号ビット、8 つの指数ビット、および 23 の小数ビットがあります。
#
# `lwc1` はビット パターンを浮動小数点レジスタにコピーします。次に、`add.s` に 3.5 と 1.25 を加算して 4.75 を生成します。
#
# 浮動小数点表現 ツールで 4.75 と 0.1 のエンコーディングを比較します。 4.75 が正確です。 0.1 には四捨五入が必要です。

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #FPU レジスタ ファイルに書き込む
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #FPU 加算器

        #Syscall 2 は、特に $f12 にある float 引数を期待します。
        mov.s $f12, $f4
        li   $v0, 2             #プリントフロート
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
