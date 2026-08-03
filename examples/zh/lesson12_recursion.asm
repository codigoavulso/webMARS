# ==========================================================
#第 12 课 - 递归每次调用都需要一个帧
#
#THE PROBLEM
#递归调用会覆盖 $ra 和参数寄存器。
#然后外部调用就无法返回并且不知道它是什么
#自己的n是。
#
#WHAT THE HARDWARE DOES
#它提供一个 $ra，而不是一堆。什么都没有保存
#自动；如果代码不保存它，它就消失了。
#
#THE SOLUTION
#每次激活都会在堆栈上打开一个帧，保留其中的内容
#通话后仍需要，并在途中恢复
#出来。堆栈深度就是递归深度。
#
#WATCH FOR
#在 mul 上设置断点并观察 $sp 每下降 8
#水平。 n 的五个保存副本使得
#乘法在返回的路上是可能的。
# ==========================================================
        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int 事实(int n) ----
fact:
        #每个调用都拥有一个不同的八字节帧。
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #此呼叫的返回地址
        sw   $a0, 4($sp)        #这个电话是n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #基本情况：0！ = 1！ = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)！
        lw   $a0, 4($sp)        #我们再次
        mul  $v0, $v0, $a0

factend:
        #恢复被调用者状态并准确丢弃在入口处分配的帧。
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
