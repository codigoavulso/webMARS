# 06 - 循环作为计数器
#
# `$t0` 是下一个要打印的数字。 `$t1` 是独占上限，因此 11 的限制会打印 1 到 10。
#
# 比较在每次迭代之前运行。增量朝着极限前进，跳转重复检查。
#
# 将限制更改为 1 并运行。退出分支在第一次打印之前进行。

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #计数寄存器
        li   $t1, 11            #极限

loop:
        # 在循环测试中，$t0是下一个候选者。仅当低于 $t1 时才打印。
        slt  $t2, $t0, $t1      #比较器
        beq  $t2, $zero, endl   #当计数达到限制时退出

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #在跳转之前更新计数器可以保证终止的进展。
        addi $t0, $t0, 1        #加法器
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
