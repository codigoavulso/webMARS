# Set-on-less-than in all four forms, then a branch chain that only lands on
# the right label if every comparison agrees with MARS.
        .text
main:   li   $t0, -5
        li   $t1, 3
        slt  $t2, $t0, $t1
        sltu $t3, $t0, $t1
        slti $t4, $t0, 0
        sltiu $t5, $t0, 0
        beq  $t2, $zero, wrong
        bne  $t3, $zero, check2
        j    wrong
check2: bgtz $t1, check3
        j    wrong
check3: bltz $t0, check4
        j    wrong
check4: blez $t0, done
        j    wrong
wrong:  li   $a0, 999
        li   $v0, 1
        syscall
        li   $v0, 10
        syscall
done:   li   $a0, 1
        li   $v0, 1
        syscall
        li   $v0, 10
        syscall
