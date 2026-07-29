# ==========================================================
# Lesson 15 - Why stride changes the speed
# Problem: two loops touch the same number of words, so why is
#          one slower on a real machine?
# Solution: memory arrives in blocks. A stride of one uses every
#          word of a block that was fetched anyway; a large
#          stride pays for a whole block and reads one word of
#          it. Open Tools > Data Cache Simulator, connect it,
#          and compare the hit rate of the two loops below.
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
