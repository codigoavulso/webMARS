# ==========================================================
#第 03 课 - 32 位逻辑门
#
#THE PROBLEM
#AND、OR 和 XOR 是一位门。一个寄存器保存 32 位。
#这么宽的门意味着什么？
#
#WHAT THE HARDWARE DOES
#它并排放置了 32 个门的副本。位 0 的
#结果仅取决于每个操作数的位 0，位 1 仅取决于
#位 1，依此类推。他们之间没有任何运输。
#
#THE SOLUTION
#这种独立性是面具发挥作用的原因：选择哪个
#位与 AND 保持一致，用 OR 强制为 1，用 XOR 翻转。
#
#WATCH FOR
#0xCC 为 11001100，掩码 0x0F 为 00001111。AND 保持
#低四位，OR 设置它们，XOR 翻转它们。只有
#低半字节不断变化。
# ==========================================================
        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F 掩码

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND 清除掩码包含零的每个位置。
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
        #XOR 仅切换掩码中选择的位置。
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
