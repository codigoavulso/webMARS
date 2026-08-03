# ==========================================================
#第 05 课 - 比较器和分支
#
#THE PROBLEM
#一个决定需要一位，但比较两个 32 位数字
#是一个减法。减法如何成为一种选择？
#
#WHAT THE HARDWARE DOES
#slt 减去并丢弃除符号之外的所有内容，
#写入 0 或 1。然后分支将该位传送给 PC
#逻辑，它要么添加偏移量，要么让 PC 前进。
#
#THE SOLUTION
#比较一个寄存器，在该寄存器上分支。控制
#流程是算术加上PC上的一个多路复用器。
#
#WATCH FOR
#slt 之后，$t2 保持 1。跳过 beq 并观看 PC
#状态栏中：它跳跃而不是前进四。
# ==========================================================
        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #一个
        li   $t1, 12            #乙
        #slt 将比较具体化为普通整数，而不是隐藏标志。
        slt  $t2, $t0, $t1      #如果 a < b，则 t2 = 1
        #仅当布尔结果为零时才分支到 notless。
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
