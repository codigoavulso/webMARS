# 05 - コンパレータと分岐
#
# `slt` は 2 つの符号付き整数を比較し、最初の整数が小さい場合は 1 を書き込み、そうでない場合は 0 を書き込みます。
#
# 7 と 12 の場合、`$t2` は 1 であるため、`beq` は `notless` にジャンプせず、実行は次の命令に続きます。
#
# 分岐を遅らせて、`beq` を通り過ぎて PC を観察します。 2 つの入力値を交換し、新しい宛先を比較します。

        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #ある
        li   $t1, 12            #b
        #slt は、比較を非表示フラグとしてではなく、通常の整数として具体化します。
        slt  $t2, $t0, $t1      #a < b の場合、t2 = 1
        #そのブール結果がゼロの場合にのみ notless に分岐します。
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
