# 08 - バイトとバイト順序
#
# このシミュレータのリトル エンディアン メモリでは、ワードの最下位バイトが最下位アドレスに存在します。
#
# `0x04030201` をワードとして保存し、オフセット 0 ～ 3 をバイトとして読み取ります。出力は 1、2、3、4 です。
#
# 下位バイト `0xFF` を試してください。 `lbu` による符号なしロードは 255 を与えますが、`lb` による符号付きロードは -1 を与えます。

        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #バイト 01 が最下位です
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #バイトオフセット
bloop:
        #ループは、保存されたワード内のオフセット 0、1、2、および 3 を訪問します。
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #実効アドレス = ベース アドレス + 現在のバイト オフセット。
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #符号なしバイト
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
