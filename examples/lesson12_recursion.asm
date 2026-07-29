# ==========================================================
# Lesson 12 - Recursion needs a frame per call
# Problem: a recursive call overwrites $ra and the argument, so
#          the outer call loses both.
# Solution: each activation saves what it still needs on the
#          stack before recursing and restores it after. The
#          stack depth is the recursion depth.
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
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
