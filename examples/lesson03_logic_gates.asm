# ==========================================================
# Lesson 03 - Logic gates across 32 bits
#
# THE PROBLEM
#   AND, OR and XOR are one-bit gates. A register holds 32 bits.
#   What does a gate mean at that width?
#
# WHAT THE HARDWARE DOES
#   It lays 32 copies of the gate side by side. Bit 0 of the
#   result depends only on bit 0 of each operand, bit 1 only on
#   bit 1, and so on. No carry travels between them.
#
# THE SOLUTION
#   That independence is what makes a mask work: choose which
#   bits to keep with AND, force to one with OR, flip with XOR.
#
# WATCH FOR
#   0xCC is 11001100 and the mask 0x0F is 00001111. AND keeps
#   the low four bits, OR sets them, XOR flips them. Only the
#   low nibble ever changes.
# ==========================================================
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
