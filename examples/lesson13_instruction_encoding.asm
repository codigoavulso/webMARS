# ==========================================================
# Lesson 13 - An instruction is a number
# Problem: the processor fetches words from memory. If code is
#          also words, what distinguishes it from data?
# Solution: nothing but how it is read. Assemble this and open
#          Main > Execute: the Code column shows each
#          instruction as the 32-bit word it really is. Compare
#          the two adds - same opcode fields, different
#          registers - and see the immediate sitting inside
#          addi.
# ==========================================================
        .text
        .globl main
main:
        add  $t0, $t1, $t2      # R-type: opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      # same shape, different registers
        addi $t0, $t1, 100      # I-type: the constant is in the word
        sll  $t0, $t1, 4        # shift amount has its own field
        j    tail               # J-type: an address, not a register
tail:
        li   $v0, 10
        syscall
