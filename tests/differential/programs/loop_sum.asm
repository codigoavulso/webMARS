# A counted loop over an array. Exercises the same instructions many times,
# which is where an off-by-one in a branch offset shows up.
        .data
arr:    .word 3, 1, 4, 1, 5, 9, 2, 6, 5, 3
        .text
main:   la   $t0, arr
        li   $t1, 10
        li   $t2, 0
        li   $t3, 0
loop:   beq  $t3, $t1, endloop
        sll  $t4, $t3, 2
        add  $t5, $t0, $t4
        lw   $t6, 0($t5)
        add  $t2, $t2, $t6
        addi $t3, $t3, 1
        j    loop
endloop:
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 10
        syscall
