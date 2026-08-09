# Lab 01 - Five stages, no hazards.
# Four independent instructions: nothing depends on anything else, so the
# pipeline should never stall.
        .text
main:   addi $t0, $zero, 5
        addi $t1, $zero, 7
        addi $t2, $zero, 9
        addi $t3, $zero, 11
