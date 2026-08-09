# Minimal case: 32-bit `li` and the $at scratch register.
#
# MARS expands `li $t0, 0x12345678` as `lui $at, 0x1234` + `ori $t0, $at, 0x5678`,
# so it destroys $at. webMARS expands it as `lui $t0, 0x1234` + `ori $t0, $t0,
# 0x5678`, which leaves $at alone. Both produce the same $t0.
#
# Run this in both simulators and compare $at at the end.
        .text
main:   li   $at, 999
        li   $t0, 0x12345678
        li   $v0, 10
        syscall
