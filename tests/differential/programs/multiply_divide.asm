# HI/LO behaviour: signed and unsigned multiply and divide, including a
# negative dividend where the sign of the remainder is the interesting part.
        .text
main:   li   $t0, 1000
        li   $t1, 7
        mult $t0, $t1
        mflo $t2
        mfhi $t3
        multu $t0, $t1
        mflo $t4
        mfhi $t5
        div  $t0, $t1
        mflo $t6
        mfhi $t7
        li   $s0, -1000
        div  $s0, $t1
        mflo $s1
        mfhi $s2
        divu $t0, $t1
        mflo $s3
        mfhi $s4
        li   $v0, 10
        syscall
