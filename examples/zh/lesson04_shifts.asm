# 04 - 移位和二的幂
#
# 当结果适合时，左移 3 乘以 8。移过边缘的位将被丢弃。
#
# 右侧，`srl` 用零填充，`sra` 复制符号位。对于 -16 移位 2，预计分别为 1073741820 和 -4。
#
# 尝试使用 -15 和 `sra`。结果是 -4，因为移位向下舍入；签署的分区轮数为零。

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
        #三个左移乘以 2^3，同时仅保留 32 个结果位。
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
        #比较十六进制的 $t3 和 $t4 以查看不同的传入位。
        sra  $t3, $t2, 2        #保留符号：-4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #零移入：巨大的正值
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
