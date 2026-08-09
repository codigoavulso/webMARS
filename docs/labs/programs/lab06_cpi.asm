# Lab 06 - CPI and instruction scheduling.
# The dependent instruction sits immediately after its producer. Moving the
# independent work in between is the point of the exercise.
        .text
main:   lw   $t0, 0($sp)
        add  $t1, $t0, $t0
        addi $t2, $zero, 1
        addi $t3, $zero, 2
