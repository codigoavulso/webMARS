# ==========================================================
# Lesson 07 - Words in memory, and why addresses jump by four
# Problem: memory is addressed by byte, yet a register holds a
#          word. What does an address really select?
# Solution: lw and sw move four bytes at a time, so consecutive
#          words sit four addresses apart. The low two bits of
#          the address must be zero: alignment is what lets the
#          hardware fetch a word in one go.
# ==========================================================
        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          # base address

        li   $t1, 111
        sw   $t1, 0($t0)        # first word
        li   $t1, 222
        sw   $t1, 4($t0)        # +4 bytes = next word
        li   $t1, 333
        sw   $t1, 8($t0)        # +8 bytes

        la   $a0, m1
        li   $v0, 4
        syscall

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
