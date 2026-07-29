# ==========================================================
# Lesson 14 - Real numbers in 32 bits
# Problem: 3.5 has no place in an integer register. How is a
#          fraction stored?
# Solution: IEEE-754 splits the word into sign, exponent and
#          fraction, and a separate register file plus its own
#          adder handle it. Open Tools > Floating Point
#          Representation to watch those three fields while the
#          values below are added.
# ==========================================================
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

        mov.s $f12, $f4
        li   $v0, 2             # print float
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
