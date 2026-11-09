# 15 - Why stride changes the speed
#
# Both loops use the same array. The first reads all 256 words; the second reads every 16th
# word, making only 16 loads.
#
# With cache blocks of 16 words, sequential reads can reuse each fetched block. The second loop
# advances to a new block at each load.
#
# Connect the simulator to MIPS, tick «Enabled» and set the block size to 16 words.
# Use the Data Cache Simulator with a breakpoint at `far` to inspect the first loop. Reset the
# cache statistics there before running the second loop, and compare hit rates.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Sequential pass: all 256 words.
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        # Sequential indexes reuse words from each cache block before moving on.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# Strided pass: one load every sixteen words.
        li   $t1, 0
        li   $t3, 0
far:
        # The next address is 64 bytes away: sixteen words at four bytes each.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
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
