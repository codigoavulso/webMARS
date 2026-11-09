# 09 - 索引数组
#
# 每个数组元素占用四个字节。将索引左移两位以计算其字节偏移量。
#
# 按照顺序`sll`、`add`、`lw`：缩放索引、添加基址并加载元素。
#
# 在索引 2 处，`$t5` 为 8，`$t6` 指向值 30。这五个元素加起来为 150。

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
