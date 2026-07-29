# ==========================================================
# Lesson 01 - Registers and immediate values
# Problem: the ALU adds registers, not numbers written in code.
#          So where does a constant live before it is added?
# Solution: an immediate is encoded inside the instruction and
#          loaded into a register first; only then can the ALU
#          read two register operands and write a third.
# ==========================================================
        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        la   $a0, lbl
        li   $v0, 4
        syscall

        li   $t0, 12            # immediate -> register
        li   $t1, 30            # immediate -> register
        add  $t2, $t0, $t1      # ALU reads two registers

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
