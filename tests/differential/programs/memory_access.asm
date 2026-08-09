# Every width of load and store, plus the sign-extension difference between
# lb and lbu and between lh and lhu.
        .data
buffer: .word 0x12345678, 0x9ABCDEF0, 0, 0
bytes:  .byte 0x7F, 0x80, 0xFF, 0x01
        .text
main:   la   $s0, buffer
        lw   $t0, 0($s0)
        lw   $t1, 4($s0)
        sw   $t0, 8($s0)
        lb   $t2, 0($s0)
        lbu  $t3, 0($s0)
        la   $s1, bytes
        lb   $t4, 1($s1)
        lbu  $t5, 1($s1)
        lh   $t6, 0($s0)
        lhu  $t7, 0($s0)
        sb   $t2, 12($s0)
        sh   $t6, 14($s0)
        lw   $s2, 12($s0)
        li   $v0, 10
        syscall
