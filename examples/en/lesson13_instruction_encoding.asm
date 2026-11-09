# 13 - An instruction is a number
#
# Assemble and inspect the Code column in the Text Segment. Each basic instruction is a 32-bit
# word divided into fields.
#
# Compare the two `add` instructions. The operation fields match, while the register fields
# encode the different operands.
#
# In `addi`, the low 16 bits hold the immediate 100, which is `0x0064`. Change it to 101 and
# reassemble to see the change.

        .text
        .globl main
main:
        # Inspect the Code column after assembly: these mnemonics are not stored as text.
        add  $t0, $t1, $t2      # R-type: opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      # same shape, different registers
        addi $t0, $t1, 100      # I-type: the constant is in the word
        sll  $t0, $t1, 4        # shift amount has its own field
        j    tail               # J-type: an address, not a register
tail:
        # li is itself expanded before execution; the processor only sees encoded words.
        li   $v0, 10
        syscall
