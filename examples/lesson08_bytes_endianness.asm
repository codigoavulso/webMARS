# ==========================================================
# Lesson 08 - Bytes inside a word, and byte order
# Problem: a word holds four bytes. Which byte does the lowest
#          address name?
# Solution: store a word, then read its bytes one address at a
#          time. On a little-endian machine the least
#          significant byte comes back first.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    # byte 01 is least significant
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             # byte offset
bloop:
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        # unsigned byte
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
