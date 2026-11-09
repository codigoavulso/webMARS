# 10 - 堆栈
#
# 按照惯例，堆栈向较低地址增长。 `$sp`减去8，为两个单词保留空间。
#
# 程序用`sw`保存两个寄存器，清除它们，然后用`lw`恢复它们的值。
#
# 预订前、两店期间、发售后请观看`$sp`。其最终值应与其初始值一致。

        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #堆栈向下增长，因此分配会从 $sp 中减去。
        addi $sp, $sp, -8       #保留两个字
        sw   $t0, 0($sp)        #推
        sw   $t1, 4($sp)

        li   $t0, 0             #破坏寄存器
        li   $t1, 0

        lw   $t0, 0($sp)        #流行音乐
        lw   $t1, 4($sp)
        #每个分配都必须平衡，以便调用者看到其原始的 $sp。
        addi $sp, $sp, 8        #释放

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
