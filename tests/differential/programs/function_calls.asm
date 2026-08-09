# jal/jr with a saved-register convention and a nested call, so a wrong link
# register or a wrong stack offset changes the printed result.
        .text
main:   li   $a0, 6
        jal  factorial
        move $s0, $v0
        move $a0, $s0
        li   $v0, 1
        syscall
        li   $v0, 10
        syscall

factorial:
        addi $sp, $sp, -8
        sw   $ra, 4($sp)
        sw   $s1, 0($sp)
        li   $v0, 1
        ble  $a0, 1, fac_done
        move $s1, $a0
        addi $a0, $a0, -1
        jal  factorial
        mul  $v0, $v0, $s1
fac_done:
        lw   $s1, 0($sp)
        lw   $ra, 4($sp)
        addi $sp, $sp, 8
        jr   $ra
