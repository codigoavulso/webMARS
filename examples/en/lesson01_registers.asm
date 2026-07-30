# ==========================================================
# Lesson 01 - Registers and immediate values
#
# THE PROBLEM
#   The ALU has two input ports and both are wired to the
#   register file. A number written in the source is not in a
#   register, so it cannot reach those ports directly.
#
# WHAT THE HARDWARE DOES
#   An immediate travels inside the instruction word itself.
#   addi carries a 16-bit field; li is a convenience the
#   assembler expands into one or two real instructions.
#
# THE SOLUTION
#   Land the constant in a register first, then let the ALU
#   read two registers and write a third.
#
# WATCH FOR
#   Step once per line and follow $t0, $t1 and $t2 in the
#   Registers panel. Only the third line touches the ALU.
# ==========================================================
        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        # Syscalls use $v0 as the service selector and $a0 as the first argument.
        la   $a0, lbl
        li   $v0, 4
        syscall

        # li is a pseudo-instruction; Assemble shows which real instruction it becomes.
        li   $t0, 12            # immediate -> register
        li   $t1, 30            # immediate -> register
        add  $t2, $t0, $t1      # ALU reads two registers

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
