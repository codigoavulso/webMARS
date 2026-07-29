# ==========================================================
# Lesson 09 - Indexing an array
# Problem: the hardware only knows base plus a constant offset.
#          How is a[i] reached when i lives in a register?
# Solution: scale the index by the element size and add it to
#          the base. The shift does the scaling for free.
# ==========================================================
        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           # base
        li   $t1, 0             # i
        li   $t2, 5             # length
        li   $t3, 0             # accumulator

sum:
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        # i * 4 bytes
        add  $t6, $t0, $t5      # base + scaled index
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
