# ==========================================================
# Lesson 12 - Recursion needs a frame per call
#
# THE PROBLEM
#   A recursive call overwrites $ra and the argument register.
#   The outer call then has no way back and no idea what its
#   own n was.
#
# WHAT THE HARDWARE DOES
#   It provides one $ra, not a stack of them. Nothing is saved
#   automatically; if the code does not save it, it is gone.
#
# THE SOLUTION
#   Each activation opens a frame on the stack, keeps what it
#   will still need after the call, and restores it on the way
#   out. The stack depth is the recursion depth.
#
# WATCH FOR
#   Set a breakpoint on the mul and watch $sp descend by 8 per
#   level. The five saved copies of n are what makes the
#   multiplication on the way back possible.
# ==========================================================
        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int fact(int n) ----
fact:
        # Each invocation owns a distinct eight-byte frame.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        # this call's return address
        sw   $a0, 4($sp)        # this call's n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             # base case: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               # $v0 = (n-1)!
        lw   $a0, 4($sp)        # our n again
        mul  $v0, $v0, $a0

factend:
        # Restore callee state and discard exactly the frame allocated on entry.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
