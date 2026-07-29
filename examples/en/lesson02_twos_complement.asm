# ==========================================================
# Lesson 02 - Two's complement
#
# THE PROBLEM
#   A register is 32 wires, each high or low. There is no wire
#   for a minus sign, yet negative numbers must work.
#
# WHAT THE HARDWARE DOES
#   It reads the top bit as a sign, but not as a separate flag:
#   -n is stored as the bit pattern that, added to n, wraps to
#   zero. Invert every bit and add one and you have it.
#
# THE SOLUTION
#   Subtraction needs no second circuit. a - b becomes
#   a + (-b), so one adder serves both operations.
#
# WATCH FOR
#   Both halves print -5. The second reaches it the long way,
#   with nor and addi, showing what sub does internally.
#   Set Values to hexadecimal to see 0xFFFFFFFB.
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
