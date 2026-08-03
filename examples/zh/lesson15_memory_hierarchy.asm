# ==========================================================
#第 15 课 - 为什么步幅会改变速度
#
#THE PROBLEM
#下面的两个循环读取相同的数组并执行相同的操作
#负载数量。在真机上要慢得多。的
#指令数无法解释它。
#
#WHAT THE HARDWARE DOES
#记忆不能传递单个单词。一次错过就获得了一个整体
#块，打赌相邻的单词很快就会被需要。
#一步迈出的一步就赢得了赌注；十六步的付出
#一个块并读取其中的一个字。
#
#THE SOLUTION
#代码中没有任何变化。地点是一个属性
#访问模式，并且它是必须固定的模式。
#
#WATCH FOR
#打开工具 > 数据缓存模拟器，按连接到 MIPS，
#然后运行。比较两个循环的命中率。两项金额
#打印 0 因为数组已归零 - 该数字不是
#点到这里，命中率就是。
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
#---- 每个块的每个单词 ----
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #顺序索引在继续之前重用每个缓存块中的字。
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

#---- 每块一个字，相隔十六个字 ----
        li   $t1, 0
        li   $t3, 0
far:
        #每次迭代添加 16 会跳过 64 个字节：通常是整个缓存块。
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
