# Lab 07 - Memory latency.
# Three memory accesses in a row make the memory port the bottleneck.
        .text
main:   lw   $t0, 0($sp)
        lw   $t1, 4($sp)
        sw   $t0, 8($sp)
        addi $t2, $zero, 1
