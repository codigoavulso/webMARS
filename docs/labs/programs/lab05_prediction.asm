# Lab 05 - Static branch prediction.
# Two branches on the same fall-through path, so the cost of the prediction
# policy is paid twice.
        .text
main:   addi $t0, $zero, 1
        addi $t1, $zero, 2
        beq  $t0, $t1, skip1
        addi $t2, $zero, 10
skip1:  beq  $t0, $t1, skip2
        addi $t3, $zero, 20
skip2:  addi $t4, $zero, 30
