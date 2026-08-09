# Lab 02 - Data hazards.
# Every instruction reads the register the previous one wrote.
        .text
main:   addi $t0, $zero, 4
        add  $t1, $t0, $t0
        add  $t2, $t1, $t0
        add  $t3, $t2, $t1
