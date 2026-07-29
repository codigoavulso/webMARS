# ==========================================================
# Lesson 05 - The comparator and the branch
#
# THE PROBLEM
#   A decision needs one bit, but comparing two 32-bit numbers
#   is a subtraction. How does a subtraction become a choice?
#
# WHAT THE HARDWARE DOES
#   slt subtracts and throws away everything except the sign,
#   writing 0 or 1. The branch then feeds that bit to the PC
#   logic, which either adds an offset or lets the PC advance.
#
# THE SOLUTION
#   Compare into a register, branch on that register. Control
#   flow is arithmetic plus one multiplexer on the PC.
#
# WATCH FOR
#   After slt, $t2 holds 1. Step past the beq and watch the PC
#   in the status bar: it jumps rather than advancing by four.
# ==========================================================
        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             # a
        li   $t1, 12            # b
        slt  $t2, $t0, $t1      # t2 = 1 if a < b
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
