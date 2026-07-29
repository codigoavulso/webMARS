# ==========================================================
# Lesson 11 - Calling a function
# Problem: jumping into a routine is easy; getting back to the
#          right place is not, because the caller could be
#          anywhere.
# Solution: jal stores the return address in $ra and jr jumps to
#          it. Arguments travel in $a0..$a3 and the result in
#          $v0 - a convention, not a wire.
# ==========================================================
        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            # first argument
        li   $a1, 42            # second argument
        jal  maxof              # $ra = address of the next line

        move $a0, $v0           # result came back in $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int maxof(int a, int b) ----
maxof:
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
