# 09 - Indexing an array
#
# Each array element occupies four bytes. Shift the index left by two to compute its byte
# offset.
#
# Follow the sequence `sll`, `add`, `lw`: scale the index, add the base address and load the
# element.
#
# At index 2, `$t5` is 8 and `$t6` points to the value 30. The five elements add up to 150.

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
        # Loop invariant: $t3 is the sum of arr[0] through arr[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        # i * 4 bytes
        add  $t6, $t0, $t5      # base + scaled index
        # $t6 now names exactly one element; lw fetches its 32-bit value.
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
