# ==========================================================
#第 09 课 - 索引数组
#
#THE PROBLEM
#加载指令提供基址寄存器和常量
#偏移。没有别的了。那么当 i 唯一的时候 a[i] 是如何到达的
#在运行时已知，坐在寄存器中？
#
#WHAT THE HARDWARE DOES
#它将基数添加到寄存器所保存的内容中。指数
#因此必须已经以字节为单位，而不是以元素为单位。
#
#THE SOLUTION
#按元素大小缩放索引，然后相加。对于四字节
#也就是说缩放是左移两位，这会花费
#什么也没有。
#
#WATCH FOR
#sll、add、lw 这三行是 a[i] 编译的内容。
#单步执行一次迭代并读取 $t5 和 $t6。
# ==========================================================
        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #基地
        li   $t1, 0             #我
        li   $t2, 5             #长度
        li   $t3, 0             #累加器

sum:
        #循环不变式：$t3 是 arr[0] 到 arr[i-1] 的和。
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #我*4字节
        add  $t6, $t0, $t5      #基数 + 缩放索引
        #$t6 现在精确命名一个元素； lw 获取其 32 位值。
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
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
