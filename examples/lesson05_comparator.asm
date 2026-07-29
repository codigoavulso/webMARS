# ==========================================================
# Lesson 05 - The comparator and the branch
# Problem: a decision needs a single bit, but comparing two
#          numbers is a subtraction. How do the two meet?
# Solution: slt subtracts and keeps only the sign bit, storing
#          0 or 1. The branch then tests that one bit and either
#          adds an offset to the PC or lets it advance.
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
