# ==========================================================
# Lesson 07 - Words in memory, and why addresses jump by four
#
# THE PROBLEM
#   Memory is addressed one byte at a time, but a register holds
#   four bytes. What does a single address actually select?
#
# WHAT THE HARDWARE DOES
#   lw and sw move four bytes in one access, so consecutive
#   words sit four addresses apart. The low two bits of the
#   address must be zero: that alignment is what lets the
#   hardware fetch a whole word in one cycle.
#
# THE SOLUTION
#   Address arithmetic is done in bytes, so an index into words
#   is always scaled by four.
#
# WATCH FOR
#   Assemble, then open the Data Segment at 0x10010000. The
#   three values appear in adjacent columns of one row.
# ==========================================================
        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          # base address

        # Every offset below is relative to $t0 and remains word-aligned.
        li   $t1, 111
        sw   $t1, 0($t0)        # first word
        li   $t1, 222
        sw   $t1, 4($t0)        # +4 bytes = next word
        li   $t1, 333
        sw   $t1, 8($t0)        # +8 bytes

        la   $a0, m1
        li   $v0, 4
        syscall

        # lw reconstructs the same 32-bit values previously written by sw.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
