# ==========================================================
# Lesson 06 - A counter, in software and in hardware
#
# THE PROBLEM
#   A hardware counter is a register, an incrementer and a
#   comparator. What does the same machine look like written
#   as instructions?
#
# WHAT THE HARDWARE DOES
#   Exactly those three parts, one per instruction: the register
#   holds the count, addi is the incrementer, slt with a branch
#   is the comparator that decides on another round.
#
# THE SOLUTION
#   A loop is not a new concept. It is sequential logic spelled
#   out, with the PC as the clock.
#
# WATCH FOR
#   $t0 is the count register and $t1 the limit. Step through
#   one full round and name which line is which part.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             # the count register
        li   $t1, 11            # the limit

loop:
        slt  $t2, $t0, $t1      # comparator
        beq  $t2, $zero, endl   # exit when count reaches limit

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t0, $t0, 1        # the adder
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
