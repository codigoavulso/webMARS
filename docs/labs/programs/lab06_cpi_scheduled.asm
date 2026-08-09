# Lab 06 - Scheduled version of lab06_cpi.asm.
# The two independent instructions now fill the load-use gap.
        .text
main:   lw   $t0, 0($sp)
        addi $t2, $zero, 1
        addi $t3, $zero, 2
        add  $t1, $t0, $t0
