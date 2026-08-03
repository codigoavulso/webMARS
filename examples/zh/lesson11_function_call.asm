# ==========================================================
#第 11 课 - 调用函数
#
#THE PROBLEM
#进入常规状态很容易。回来不是因为
#可以从许多地方调用相同的例程，并且
#返回地址每次都不同。
#
#WHAT THE HARDWARE DOES
#jal 在一条指令中做了两件事：它存储
#$ra 中后续指令的地址，然后跳转。少年
#跳转到寄存器保存的任何内容，因此 jr $ra 返回。
#
#THE SOLUTION
#其他一切都是协议，而不是电路：争论
#$a0..$a3，结果为 $v0。打破惯例和守则
#仍然组装 - 它只是停止互操作。
#
#WATCH FOR
#走上 jal 并阅读 $ra。与地址进行比较
#文本段中调用后的行的位置。
# ==========================================================
        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #第一个论点
        li   $a1, 42            #第二个参数
        #jal 在一个架构操作中同时更改控制流和 $ra。
        jal  maxof              #$ra = 下一行的地址

        move $a0, $v0           #结果返回到 $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof 是一个叶函数，因此它可以返回而不将 $ra 保存在堆栈上。
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
