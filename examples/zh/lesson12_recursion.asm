# 12 - 递归和框架
#
# 递归调用会覆盖 `$ra` 并使用 `$a0` 作为自己的参数。在调用之前保存这两个值。
#
# 对于从 5 到 1 的每个值，进入 `fact`。每个调用保留 8 个字节，包括返回 1 的调用。
#
# 在 `mul` 设置断点以观察返回路径。每次调用都会重新加载自己的参数，相乘并释放其框架。

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
        # 在释放此调用的帧之前恢复保存的返回地址。
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
