# ==========================================================
# Lesson 10 - The stack is just a register and an offset
# Problem: registers are few. Where do values go when they must
#          survive across other work?
# Solution: $sp points into memory and the stack grows towards
#          lower addresses. Reserving space is a subtraction,
#          releasing it an addition. Nothing else is special.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        addi $sp, $sp, -8       # reserve two words
        sw   $t0, 0($sp)        # push
        sw   $t1, 4($sp)

        li   $t0, 0             # clobber the registers
        li   $t1, 0

        lw   $t0, 0($sp)        # pop
        lw   $t1, 4($sp)
        addi $sp, $sp, 8        # release

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
