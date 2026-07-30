# ==========================================================
# Lesson 04 - Shifts, or multiplying with wires
#
# THE PROBLEM
#   A general multiplier is one of the most expensive blocks in
#   a datapath. Multiplying by 8 should not cost that much.
#
# WHAT THE HARDWARE DOES
#   A shift is not arithmetic at all: it is the same bits read
#   from different wires. Shifting left by n multiplies by 2^n
#   and costs only routing.
#
# THE SOLUTION
#   Powers of two become shifts. Note the two right shifts: srl
#   feeds zeros in at the top, sra copies the sign bit, so only
#   sra divides a negative number correctly.
#
# WATCH FOR
#   -16 >> 2 gives -4 with sra but a huge positive with srl. The
#   bits moved identically; only what entered at the top differs.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        # Three left shifts multiply by 2^3 while retaining only 32 result bits.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        # Compare $t3 and $t4 in hexadecimal to see the different incoming bits.
        sra  $t3, $t2, 2        # sign preserved: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        # zeros shifted in: huge positive
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
