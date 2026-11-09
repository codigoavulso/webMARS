# 03 - Logic gates over 32 bits
#
# Each result bit depends only on the corresponding bits of the two operands. There is no carry
# between bit positions.
#
# With mask `0x0F`, AND keeps the low four bits and clears the rest. OR sets the low four bits
# and XOR flips them.
#
# Compare the three results in hexadecimal, then try mask `0xF0` to work on the next group of
# four bits.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           # 0xCC
        li   $t1, 15            # 0x0F mask

        la   $a0, ma
        li   $v0, 4
        syscall
        # AND clears every position where the mask contains zero.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        # XOR toggles only the positions selected by ones in the mask.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
