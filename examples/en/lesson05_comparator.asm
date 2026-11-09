# 05 - Comparator and branch
#
# `slt` compares two signed integers and writes 1 when the first is smaller, or 0 otherwise.
#
# For 7 and 12, `$t2` is 1, so `beq` does not jump to `notless` and execution continues to the
# next instruction.
#
# With delayed branching off, step past `beq` and observe the PC. Swap the two input values and
# compare the new destination.

        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             # a
        li   $t1, 12            # b
        # slt materializes the comparison as an ordinary integer, never as hidden flags.
        slt  $t2, $t0, $t1      # t2 = 1 if a < b
        # Branch to notless only when that Boolean result is zero.
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
