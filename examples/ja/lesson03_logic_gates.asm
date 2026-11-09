# 03 - 32 ビット以上の論理ゲート
#
# 結果の各ビットは、2 つのオペランドの対応するビットにのみ依存します。ビット位置間のキャリーはありません。
#
# マスク `0x0F` を使用すると、AND は下位 4 ビットを保持し、残りをクリアします。 OR は下位 4 ビットを設定し、XOR はそれらを反転します。
#
# 3 つの結果を 16 進数で比較し、マスク `0xF0` を使用して次の 4 ビットのグループを処理してみます。

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F マスク

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND は、マスクにゼロが含まれるすべての位置をクリアします。
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR は、マスク内の 1 によって選択された位置のみを切り替えます。
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
