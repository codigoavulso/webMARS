# Lab 03 - Forwarding and the load-use case.
# The first pair is an ALU-to-ALU dependency that forwarding removes entirely.
# The second pair is a load-use dependency that forwarding cannot remove.
        .text
main:   addi $t0, $zero, 8
        add  $t1, $t0, $t0
        lw   $t2, 0($t1)
        add  $t3, $t2, $t1
