# ==========================================================
# Lesson 13 - An instruction is a number
#
# THE PROBLEM
#   The processor fetches words from memory. Code lives in
#   memory too. So what distinguishes an instruction from a
#   piece of data?
#
# WHAT THE HARDWARE DOES
#   Nothing, beyond which register the word is loaded into. The
#   PC selects words that go to the decoder; lw selects words
#   that go to the register file. The bits are the same kind.
#
# THE SOLUTION
#   Read the encoding directly. Assemble and open
#   Main > Execute: the Code column shows each instruction as
#   the 32-bit word it really is.
#
# WATCH FOR
#   This lesson prints nothing on purpose - the output is the
#   Text Segment itself. Compare the two adds: same opcode and
#   funct fields, different register numbers. Then find the
#   literal 100 inside the addi word.
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
