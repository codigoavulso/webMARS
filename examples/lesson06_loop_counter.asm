# ==========================================================
# Lesson 06 - A counter, in software and in hardware
# Problem: a hardware counter is a register plus an adder plus
#          a comparator. What does the same thing look like in
#          instructions?
# Solution: exactly those three parts. The register holds the
#          count, addi increments it, and slt with a branch
#          decides whether to go round again.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             # the count register
        li   $t1, 11            # the limit

loop:
        slt  $t2, $t0, $t1      # comparator
        beq  $t2, $zero, endl   # exit when count reaches limit

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t0, $t0, 1        # the adder
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
