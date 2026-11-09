# 11 - 関数の呼び出し
#
# 遅延分岐して実行します。 `jal` は関数にジャンプし、次の命令のアドレスを `$ra` に入れます。
#
# 呼び出し規約は、`$a0` と `$a1` で 17 と 42 を渡します。この関数は、`$v0` の大きい方の値を返します。
#
# 通話に参加し、`$ra` を `jal` の後のアドレスと比較し、`jr $ra` に従って発信者に戻ります。

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #最初の引数
        li   $a1, 42            #2 番目の引数
        jal  maxof

        move $a0, $v0           #結果が $v0 で返されました
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof はリーフ関数であるため、$ra をスタックに保存せずに返すことができます。
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
