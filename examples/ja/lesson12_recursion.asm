# 12 - 再帰とフレーム
#
# 再帰呼び出しは `$ra` を上書きし、独自の引数に `$a0` を使用します。電話をかける前に両方の値を保存してください。
#
# 5 から 1 までの各値に対して `fact` にステップインします。すべての呼び出しでは、1 を返す呼び出しを含め、8 バイトが予約されます。
#
# `mul` にブレークポイントを設定してリターン パスを監視します。各呼び出しは、独自の引数を再ロードし、そのフレームを乗算して解放します。

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fat(int n) ----
fact:
        #各呼び出しは、個別の 8 バイトのフレームを所有します。
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #この通話の返信先アドレス
        sw   $a0, 4($sp)        #この電話はnです

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #基本ケース: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #私たちのもう一度
        mul  $v0, $v0, $a0

factend:
        # このコールのフレームを解放する前に、保存されたリターン アドレスを復元してください。
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
