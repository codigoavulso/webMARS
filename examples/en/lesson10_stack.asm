# 10 - The stack
#
# By convention the stack grows toward lower addresses. Subtract 8 from `$sp` to reserve space
# for two words.
#
# The program saves two registers with `sw`, clears them, then restores their values with `lw`.
#
# Watch `$sp` before reservation, during the two stores and after release. Its final value
# should match its initial value.

        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        # The stack grows downward, so allocation subtracts from $sp.
        addi $sp, $sp, -8       # reserve two words
        sw   $t0, 0($sp)        # push
        sw   $t1, 4($sp)

        li   $t0, 0             # clobber the registers
        li   $t1, 0

        lw   $t0, 0($sp)        # pop
        lw   $t1, 4($sp)
        # Every allocation must be balanced so the caller sees its original $sp.
        addi $sp, $sp, 8        # release

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
