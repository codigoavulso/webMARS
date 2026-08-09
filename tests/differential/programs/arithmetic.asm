# Signed and unsigned arithmetic, including the boundaries where a 32-bit
# coercion mistake would show up.
        .text
main:   li   $t0, 5
        li   $t1, 7
        add  $t2, $t0, $t1
        sub  $t3, $t1, $t0
        addi $t4, $t0, -100
        addu $t5, $t0, $t1
        subu $t6, $t0, $t1
        lui  $t7, 0x7fff
        ori  $t7, $t7, 0xffff
        addiu $s0, $t7, 1
        li   $s1, -1
        addu $s2, $s1, $s1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 10
        syscall
