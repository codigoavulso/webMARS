# 05 - 比较器和分支
#
# `slt` 比较两个有符号整数，当第一个较小时写入 1，否则写入 0。
#
# 对于7和12，`$t2`为1，因此`beq`不会跳转到`notless`，而是继续执行下一条指令。
#
# 在延迟分支的情况下，跨过 `beq` 并观察 PC。交换两个输入值并比较新的目的地。

        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #一个
        li   $t1, 12            #乙
        #slt 将比较具体化为普通整数，而不是隐藏标志。
        slt  $t2, $t0, $t1      #如果 a < b，则 t2 = 1
        #仅当布尔结果为零时才分支到 notless。
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
