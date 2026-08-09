# Data directives and alignment. The data segment dump is what is compared, so
# any difference in padding or byte order is visible.
        .data
w:      .word 1, -1, 0x7FFFFFFF, 0x80000000
h:      .half 1, -1, 0x7FFF
b:      .byte 1, -1, 0x7F, 0x80
        .align 2
aligned:.word 0xDEADBEEF
s:      .asciiz "abc"
        .align 2
after:  .word 0xCAFEBABE
sp:     .space 8
        .text
main:   la   $t0, w
        lw   $t1, 0($t0)
        la   $t2, aligned
        lw   $t3, 0($t2)
        la   $t4, after
        lw   $t5, 0($t4)
        li   $v0, 10
        syscall
