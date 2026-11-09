# 08 - 字节和字节顺序
#
# 在该模拟器的小端存储器中，字的最低有效字节位于最低地址。
#
# 将 `0x04030201` 存储为字，并将偏移量 0 到 3 作为字节读取。输出为 1、2、3、4。
#
# 尝试使用低字节`0xFF`。带有 `lbu` 的无符号负载给出 255，而带有 `lb` 的有符号负载给出 -1。

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
