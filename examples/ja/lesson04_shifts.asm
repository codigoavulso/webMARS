# 04 - シフトと 2 の累乗
#
# 左に 3 シフトすると、結果が適合する場合は 8 が乗算されます。エッジを越えてシフトされたビットは破棄されます。
#
# 右側では、`srl` はゼロで埋められ、`sra` は符号ビットをコピーします。 -16 を 2 シフトすると、それぞれ 1073741820 と -4 が期待されます。
#
# `sra` で -15 を試してください。シフトが切り捨てられるため、結果は -4 になります。符号付き除算はゼロに向かって丸められます。

        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #3 回の左シフトは 2^3 を乗算し、結果の 32 ビットのみを保持します。
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #$t3 と $t4 を 16 進数で比較して、異なる受信ビットを確認します。
        sra  $t3, $t2, 2        #符号の保持: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #ゼロがシフトイン: 大きなプラス
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
