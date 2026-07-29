# ==========================================================
# Lesson 02 - Two's complement
# Problem: the hardware has no minus sign, only 32 wires.
#          How is a negative number represented?
# Solution: negate every bit and add one. Subtraction then
#          reuses the very same adder: a - b = a + (-b).
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
        li   $t0, 5
        sub  $t1, $zero, $t0    # the adder does the work
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        nor  $t2, $t0, $zero    # invert all bits
        addi $t2, $t2, 1        # add one
        move $a0, $t2           # same value as above
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
