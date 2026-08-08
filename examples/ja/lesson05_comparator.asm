# ==========================================================
#レッスン 05 - コンパレータと分岐
#
#THE PROBLEM
#決定には 1 ビットが必要ですが、2 つの 32 ビット数値を比較します
#は引き算です。どのようにして引き算が選択肢になるのでしょうか?
#
#WHAT THE HARDWARE DOES
#slt は符号以外のすべてを減算して破棄します。
#0 または 1 を書き込みます。ブランチはそのビットを PC に送ります。
#オフセットを追加するか、PC を前進させるロジックです。
#
#THE SOLUTION
#レジスタと比較し、そのレジスタで分岐します。制御
#フローは算術演算と PC 上の 1 つのマルチプレクサです。
#
#WATCH FOR
#slt の後、$t2 は 1 を保持します。beq を通過して PC を監視します。
#ステータス バー: 4 つずつ進むのではなく、ジャンプします。
# ==========================================================
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
