# 14 - Real numbers in 32 bits
#
# A single-precision float has one sign bit, eight exponent bits and 23 fraction bits.
#
# `lwc1` copies the bit pattern into a floating-point register. Then `add.s` adds 3.5 and 1.25
# to produce 4.75.
#
# Compare the encodings of 4.75 and 0.1 in the Floating Point Representation tool. 4.75 is
# exact; 0.1 needs rounding.

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        # into the FPU register file
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     # the FPU adder

        # Syscall 2 expects its float argument specifically in $f12.
        mov.s $f12, $f4
        li   $v0, 2             # print float
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
