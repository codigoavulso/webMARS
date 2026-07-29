# ==========================================================
# Lesson 10 - The stack is a register and an offset
#
# THE PROBLEM
#   There are 32 registers and they are shared by every piece of
#   code. Where does a value go when it must survive work that
#   will reuse those registers?
#
# WHAT THE HARDWARE DOES
#   Nothing special at all. $sp is an ordinary register that
#   happens to point into memory, and the stack grows towards
#   lower addresses purely by convention.
#
# THE SOLUTION
#   Reserving space is a subtraction from $sp, releasing it an
#   addition. Push and pop are just sw and lw.
#
# WATCH FOR
#   The registers are deliberately cleared between the stores
#   and the loads, so the printed values can only have come
#   back from memory. Watch $sp move by 8 and back.
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
