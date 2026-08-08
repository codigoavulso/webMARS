# ==========================================================
#レッスン 03 - 32 ビットにわたる論理ゲート
#
#THE PROBLEM
#AND、OR および XOR は 1 ビット ゲートです。レジスタは 32 ビットを保持します。
#その幅のゲートは何を意味するのでしょうか？
#
#WHAT THE HARDWARE DOES
#ゲートのコピーを 32 枚並べて配置します。のビット0
#結果は各オペランドのビット 0 のみに依存し、ビット 1 は各オペランドのビット 1 のみに依存します。
#ビット 1 など。それらの間をキャリーが移動することはありません。
#
#THE SOLUTION
#その独立性がマスクを機能させるのです。どれを選択するか
#AND で保持するビット、OR で強制的に 1 に、XOR で反転します。
#
#WATCH FOR
#0xCC は 11001100 で、マスク 0x0F は 00001111 です。 AND は維持されます
#下位 4 ビット、またはそれらを設定し、XOR で反転します。のみ
#低いニブルは常に変化します。
# ==========================================================
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
