# ==========================================================
# Lesson 08 - Bytes inside a word, and byte order
#
# THE PROBLEM
#   A word occupies four addresses. Which byte does the lowest
#   of those addresses name?
#
# WHAT THE HARDWARE DOES
#   That choice is byte order, and it is a wiring decision made
#   once for the whole machine. MIPS here is little-endian: the
#   least significant byte lives at the lowest address.
#
# THE SOLUTION
#   Store one word, then read it back a byte at a time and let
#   the order answer the question for you.
#
# WATCH FOR
#   0x04030201 comes back as 1 2 3 4. The byte written last in
#   the literal is read first. lbu is used rather than lb so a
#   byte above 127 is not sign-extended.
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
