# add overflows where addu does not. MARS raises an exception; the comparison
# checks that both simulators agree on which one traps.
        .text
main:   lui  $t0, 0x7FFF
        ori  $t0, $t0, 0xFFFF
        addu $t1, $t0, $t0
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 10
        syscall
