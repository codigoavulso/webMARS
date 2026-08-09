# Lab 04 - Branches and discarded instructions.
# One conditional branch followed by straight-line code.
        .text
main:   addi $t0, $zero, 1
        addi $t1, $zero, 1
        beq  $t0, $t1, target
        addi $t2, $zero, 100
        addi $t3, $zero, 200
target: addi $t4, $zero, 300
        addi $t5, $zero, 400
