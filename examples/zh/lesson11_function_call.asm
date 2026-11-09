# 11 - 调用函数
#
# 延迟分支运行。 `jal`跳转到函数并将下一条指令的地址放入`$ra`。
#
# 调用约定在`$a0`和`$a1`中传递17和42。该函数返回 `$v0` 中较大的值。
#
# 进入调用，将`$ra`与`jal`之后的地址进行比较，然后按照`jr $ra`回到调用者。

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
        jal  maxof

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
