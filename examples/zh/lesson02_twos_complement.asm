# ==========================================================
#第 02 课 - 二进制补码
#
#THE PROBLEM
#一个寄存器有 32 条线，每条线为高电平或低电平。没有电线
#对于负号，但负数必须有效。
#
#WHAT THE HARDWARE DOES
#它将最高位读取为符号，但不作为单独的标志：
#-n 存储为位模式，添加到 n 后换行为
#零。将每一位反转并添加一位即可。
#
#THE SOLUTION
#减法不需要第二个电路。 a - b 变为
#a + (-b)，因此一个加法器同时服务于这两种操作。
#
#WATCH FOR
#两半都打印-5。第二个到达它很长的路，
#与nor和addi一起显示sub内部的作用。
#将值设置为十六进制以查看 0xFFFFFFFB。
# ==========================================================
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
