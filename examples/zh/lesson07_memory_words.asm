# ==========================================================
#第 07 课 - 内存中的单词，以及为什么地址跳变四
#
#THE PROBLEM
#内存一次寻址一个字节，但寄存器保存
#四个字节。单个地址实际上选择了什么？
#
#WHAT THE HARDWARE DOES
#lw 和 sw 在一次访问中移动四个字节，因此是连续的
#单词相隔四个地址。的低两位
#地址必须为零：这种对齐方式让
#硬件在一个周期内获取整个字。
#
#THE SOLUTION
#地址算术以字节为单位完成，因此索引为字
#总是按四缩放。
#
#WATCH FOR
#组装，然后打开 0x10010000 处的数据段。的
#三个值出现在一行的相邻列中。
# ==========================================================
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
