# ==========================================================
#第 04 课 - 移位或与线相乘
#
#THE PROBLEM
#通用乘法器是最昂贵的模块之一
#数据路径。乘以 8 应该不会花费那么多。
#
#WHAT THE HARDWARE DOES
#移位根本不是算术：它是读取相同的位
#来自不同的电线。左移 n 乘以 2^n
#并且仅花费路由。
#
#THE SOLUTION
#两人的权力变成了转变。注意两个右移：srl
#在顶部输入零，sra 复制符号位，所以只有
#sra 正确地除负数。
#
#WATCH FOR
#-16 >> 2 对于 sra 给出 -4，但对于 srl 则给出巨大的正数。的
#位的移动方式相同；只有顶部输入的内容有所不同。
# ==========================================================
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
