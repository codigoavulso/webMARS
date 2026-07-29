# ==========================================================
# Lesson 11 - Calling a function
#
# THE PROBLEM
#   Jumping into a routine is easy. Getting back is not, because
#   the same routine may be called from many places and the
#   return address differs every time.
#
# WHAT THE HARDWARE DOES
#   jal does two things in one instruction: it stores the
#   address of the following instruction in $ra, then jumps. jr
#   jumps to whatever a register holds, so jr $ra returns.
#
# THE SOLUTION
#   Everything else is agreement, not circuitry: arguments in
#   $a0..$a3, results in $v0. Break the convention and the code
#   still assembles - it simply stops interoperating.
#
# WATCH FOR
#   Step onto the jal and read $ra. Compare it with the address
#   of the line after the call in the Text Segment.
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
