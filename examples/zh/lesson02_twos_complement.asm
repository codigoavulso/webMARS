# 02 - 二进制补码
#
# 在 32 位二进制补码中，将 5 的位取反并加 1 会产生 -5 的表示形式。
#
# 该程序以两种方式计算相同的值：从零开始计算`sub`，然​​后计算`nor`和`addi`。
#
# 两个路径都打印 -5。检查寄存器中的`0xFFFFFFFB`以查看相同的位在十六进制中的样子。

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #从零减去形成不带负号位的加法逆元。
        li   $t0, 5
        sub  $t1, $zero, $t0    #加法器完成工作
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #也不与 $zero 按位 NOT;加一完成二进制补码。
        nor  $t2, $t0, $zero    #反转所有位
        addi $t2, $t2, 1        #添加一个
        move $a0, $t2           #与上面相同的值
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
