# ==========================================================
# Lesson 15 - Why stride changes the speed
#
# THE PROBLEM
#   The two loops below read the same array and perform the same
#   number of loads. On a real machine one is far slower. The
#   instruction count cannot explain it.
#
# WHAT THE HARDWARE DOES
#   Memory does not deliver single words. A miss fetches a whole
#   block, betting that neighbouring words will be wanted soon.
#   A stride of one collects that bet; a stride of sixteen pays
#   for a block and reads one word of it.
#
# THE SOLUTION
#   Nothing in the code changes. Locality is a property of the
#   access pattern, and it is the pattern that must be fixed.
#
# WATCH FOR
#   Open Tools > Data Cache Simulator, press Connect to MIPS,
#   then run. Compare the hit rate of the two loops. Both sums
#   print 0 because the array is zeroed - the number is not the
#   point here, the hit rate is.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# ---- every word of each block ----
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# ---- one word per block, sixteen words apart ----
        li   $t1, 0
        li   $t3, 0
far:
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
