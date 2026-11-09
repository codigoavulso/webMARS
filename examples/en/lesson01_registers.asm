# 01 - Registers and immediates
#
# The immediate is encoded in the instruction. Assemble and check which basic instruction each
# `li` becomes.
#
# Step through the two loads and the addition. In Registers, follow `$t0 = 12`, `$t1 = 30` and
# `$t2 = 42`.
#
# Try replacing 30 with `0x12345678` and reassemble. The larger constant needs more than one
# basic instruction.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        # Syscalls use $v0 as the service selector and $a0 as the first argument.
        la   $a0, lbl
        li   $v0, 4
        syscall

        # li is a pseudo-instruction; Assemble shows which real instruction it becomes.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # The sum is written to a different register.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
