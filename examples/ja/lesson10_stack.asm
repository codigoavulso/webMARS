# 10 - スタック
#
# 慣例により、スタックは下位アドレスに向かって増加します。 `$sp` から 8 を引いて、2 つの単語のためのスペースを確保します。
#
# プログラムは 2 つのレジスタを `sw` で保存し、それらをクリアしてから、`lw` で値を復元します。
#
# 予約前、2店舗開催中、発売後に`$sp`をご覧ください。最終値は初期値と一致する必要があります。

        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #スタックは下方向に成長するため、割り当ては $sp から減算されます。
        addi $sp, $sp, -8       #2つの単語を保留します
        sw   $t0, 0($sp)        #押す
        sw   $t1, 4($sp)

        li   $t0, 0             #レジスターを破壊する
        li   $t1, 0

        lw   $t0, 0($sp)        #ポップ
        lw   $t1, 4($sp)
        #呼び出し元が元の $sp を参照できるように、すべての割り当てのバランスを取る必要があります。
        addi $sp, $sp, 8        #リリース

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
