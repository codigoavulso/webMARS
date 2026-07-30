# ==========================================================
# Lesson 14 - Real numbers in 32 bits
#
# THE PROBLEM
#   3.5 has no place in an integer register. Where does the
#   fractional part go, and how is a very large number stored
#   in the same 32 bits as a very small one?
#
# WHAT THE HARDWARE DOES
#   IEEE-754 splits the word into three fields: one sign bit,
#   eight exponent bits and twenty-three fraction bits. The
#   exponent slides the binary point, which is why the format is
#   called floating point.
#
# THE SOLUTION
#   A separate register file ($f0..$f31) and a separate adder
#   handle these values, which is why the mnemonics differ:
#   lwc1 to load, add.s to add, syscall 2 to print.
#
# WATCH FOR
#   Open Tools > Floating Point Representation and enter 3.5.
#   Watch the three fields, then check that 4.75 is exact -
#   unlike 0.1, which has no finite binary fraction.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        # Integer addresses still locate the data; lwc1 moves its bits into COP1.
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
