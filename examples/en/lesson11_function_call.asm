# 11 - Calling a function
#
# Run with delayed branching off. `jal` jumps to the function and puts the address of the next
# instruction in `$ra`.
#
# The calling convention passes 17 and 42 in `$a0` and `$a1`. The function returns the larger
# value in `$v0`.
#
# Step into the call, compare `$ra` with the address after `jal`, then follow `jr $ra` back to
# the caller.

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            # first argument
        li   $a1, 42            # second argument
        jal  maxof

        move $a0, $v0           # result came back in $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int maxof(int a, int b) ----
maxof:
        # maxof is a leaf function, so it can return without saving $ra on the stack.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
