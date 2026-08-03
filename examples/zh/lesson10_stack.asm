# ==========================================================
#第 10 课 - 堆栈是一个寄存器和一个偏移量
#
#THE PROBLEM
#共有32个寄存器，每个寄存器都是共享的
#代码。当一个价值必须生存下来时，它该去哪里？
#会重用那些寄存器吗？
#
#WHAT THE HARDWARE DOES
#没什么特别的。 $sp 是一个普通寄存器
#碰巧指向内存，并且堆栈向
#纯粹按照惯例较低的地址。
#
#THE SOLUTION
#保留空间是从 $sp 中减去，释放它
#另外。 Push 和 Pop 只是 sw 和 lw。
#
#WATCH FOR
#寄存器在存储之间被故意清除
#和负载，所以打印的值只能是
#从记忆中回来。观察 $sp 移动 8 并返回。
# ==========================================================
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
