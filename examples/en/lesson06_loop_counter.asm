# 06 - Loop as a counter
#
# `$t0` is the next number to print. `$t1` is the exclusive upper limit, so a limit of 11 prints
# 1 through 10.
#
# The comparison runs before each iteration. The increment makes progress toward the limit, and
# the jump repeats the check.
#
# Change the limit to 1 and run. The exit branch is taken before the first print.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             # the count register
        li   $t1, 11            # the limit

loop:
        # At the loop test, $t0 is the next candidate. Print it only if it is below $t1.
        slt  $t2, $t0, $t1      # comparator
        beq  $t2, $zero, endl   # exit when count reaches limit

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        # Updating the counter before jumping guarantees progress toward termination.
        addi $t0, $t0, 1        # the adder
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
