# 03 - 32 位以上的逻辑门
#
# 每个结果位仅取决于两个操作数的相应位。位位置之间没有进位。
#
# 使用掩码`0x0F`，AND 保留低四位并清除其余位。 OR 设置低四位，XOR 翻转它们。
#
# 比较十六进制的三个结果，然后尝试使用掩码 `0xF0` 处理下一组四位。

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
