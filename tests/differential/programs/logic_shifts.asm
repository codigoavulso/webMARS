# Bitwise operations and every shift form, including the arithmetic-versus
# -logical distinction that is easy to get wrong on negative values.
        .text
main:   li   $t0, 0xF0F0F0F0
        li   $t1, 0x0FF00FF0
        and  $t2, $t0, $t1
        or   $t3, $t0, $t1
        xor  $t4, $t0, $t1
        nor  $t5, $t0, $t1
        andi $t6, $t0, 0xFFFF
        ori  $t7, $t0, 0x00FF
        xori $s0, $t0, 0xAAAA
        sll  $s1, $t0, 4
        srl  $s2, $t0, 4
        sra  $s3, $t0, 4
        li   $s4, 8
        sllv $s5, $t0, $s4
        srlv $s6, $t0, $s4
        srav $s7, $t0, $s4
        li   $v0, 10
        syscall
