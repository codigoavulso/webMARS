# 15 - 为什么步幅会改变速度
#
# 两个循环都使用相同的数组。第一个读取全部 256 个单词；第二个每 16 个单词读取一次，仅加载 16 个单词。
#
# 对于 16 个字的缓存块，顺序读取可以重用每个获取的块。第二个循环在每次加载时前进到一个新块。
#
# 将模拟器连接到 MIPS，勾选“启用”，并将块大小设为 16 个字。
# 使用 数据缓存模拟器 并在 `far` 处设置断点来检查第一个循环。在运行第二个循环之前重置缓存统计信息，并比较命中率。

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# 顺序传递：全部 256 个单词。
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

# 跨步：每十六字一载。
        li   $t1, 0
        li   $t3, 0
far:
        # 下一个地址相距 64 个字节：十六个字，每个字四个字节。
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
