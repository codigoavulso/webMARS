# 08 - Bytes and byte order
#
# In this simulator's little-endian memory, the least significant byte of a word lives at the
# lowest address.
#
# Store `0x04030201` as a word and read offsets 0 through 3 as bytes. The output is 1, 2, 3, 4.
#
# Try a low byte of `0xFF`. An unsigned load with `lbu` gives 255, while a signed load with `lb`
# gives -1.

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
        # The loop visits offsets 0, 1, 2 and 3 inside the stored word.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        # Effective address = base address + current byte offset.
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
