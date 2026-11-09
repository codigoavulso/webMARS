# 04 - Shifts and powers of two
#
# A left shift by 3 multiplies by 8 when the result fits. Bits shifted past the edge are
# discarded.
#
# On the right, `srl` fills with zeros and `sra` copies the sign bit. For -16 shifted by 2,
# expect 1073741820 and -4 respectively.
#
# Try -15 with `sra`. The result is -4 because the shift rounds down; signed division rounds
# toward zero.

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
