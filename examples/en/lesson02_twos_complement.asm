# 02 - Two's complement
#
# In 32-bit two's complement, inverting the bits of 5 and adding 1 produces the representation
# of -5.
#
# The program computes the same value two ways: `sub` from zero, then `nor` and `addi`.
#
# Both paths print -5. Inspect `0xFFFFFFFB` in the registers to see how the same bits look in
# hexadecimal.

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        # Subtracting from zero forms the additive inverse without a minus-sign bit.
        li   $t0, 5
        sub  $t1, $zero, $t0    # the adder does the work
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        # nor with $zero is bitwise NOT; adding one completes two's complement.
        nor  $t2, $t0, $zero    # invert all bits
        addi $t2, $t2, 1        # add one
        move $a0, $t2           # same value as above
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
