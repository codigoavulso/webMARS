# 12 - Recursion and frames
#
# A recursive call overwrites `$ra` and uses `$a0` for its own argument. Save both values before
# making the call.
#
# Step into `fact` for each value from 5 to 1. Every call reserves eight bytes, including the
# call that returns 1.
#
# Set a breakpoint on `mul` to watch the return path. Each call reloads its own argument,
# multiplies and releases its frame.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int fact(int n) ----
fact:
        # Each invocation owns a distinct eight-byte frame.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        # this call's return address
        sw   $a0, 4($sp)        # this call's n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             # base case: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               # $v0 = (n-1)!
        lw   $a0, 4($sp)        # our n again
        mul  $v0, $v0, $a0

factend:
        # Restore the saved return address before releasing this call's frame.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
