# 14 - 32 位实数
#
# 单精度浮点数有 1 个符号位、8 个指数位和 23 个小数位。
#
# `lwc1` 将位模式复制到浮点寄存器中。然后 `add.s` 添加 3.5 和 1.25 得到 4.75。
#
# 在浮点表示工具中比较4.75和0.1的编码。 4.75 是准确的； 0.1 需要四舍五入。

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #进入 FPU 寄存器文件
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #FPU 加法器

        #系统调用 2 期望其 float 参数特别位于 $f12 中。
        mov.s $f12, $f4
        li   $v0, 2             #打印浮动
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
