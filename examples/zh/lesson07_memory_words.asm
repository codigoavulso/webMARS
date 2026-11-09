# 07 - 记忆中的单词
#
# 内存地址计数字节。每个字占用四个字节，因此`lw`和`sw`这里使用偏移量0、4和8。
#
# 字地址必须是四的倍数。使用偏移量 1 而不是 4 会导致该程序中出现对齐异常。
#
# 在存储之后，查看数据段中的`cell`。三个相邻的单词应包含 111、222 和 333。

        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #基址

        #下面的每个偏移量都相对于 $t0 并保持字对齐。
        li   $t1, 111
        sw   $t1, 0($t0)        #第一个词
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 字节 = 下一个字
        li   $t1, 333
        sw   $t1, 8($t0)        #+8字节

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw 重建先前由 sw 写入的相同 32 位值。
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
