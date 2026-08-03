# ==========================================================
#第 08 课 - 字内的字节和字节顺序
#
#THE PROBLEM
#一个字占用四个地址。哪个字节的最低位
#这些地址的名称？
#
#WHAT THE HARDWARE DOES
#这个选择是字节顺序，这是一个接线决定
#整机一次。 MIPS 这里是小端：
#最低有效字节位于最低地址。
#
#THE SOLUTION
#存储一个字，然后一次读回一个字节，让
#该订单为您解答问题。
#
#WATCH FOR
#0x04030201 返回为 1 2 3 4。最后写入的字节
#首先读取文字。使用 lbu 而不是 lb 所以
#127 以上的字节不进行符号扩展。
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #字节 01 最低有效
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #字节偏移量
bloop:
        #该循环访问存储字内的偏移量 0、1、2 和 3。
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #有效地址=基地址+当前字节偏移量。
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #无符号字节
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
