# 07 - Words in memory
#
# Memory addresses count bytes. Each word occupies four bytes, so `lw` and `sw` use offsets 0, 4
# and 8 here.
#
# A word address must be a multiple of four. Using offset 1 instead of 4 causes an alignment
# exception in this program.
#
# After the stores, look at `cell` in the Data Segment. The three adjacent words should contain
# 111, 222 and 333.

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
