# Minimal case: `ble` against an immediate, with the minimum signed integer.
#
# MARS expands `ble $t0, 5, label` as `addi $at, $t0, -1` / `slti $at, $at, 5` /
# `bne $at, $zero, label`. The `addi` traps on overflow, so the comparison
# itself can raise an exception when $t0 holds -2147483648.
#
# webMARS expands it as `addiu $at, $zero, 5` / `slt $at, $at, $t0` /
# `beq $at, $zero, label`, which cannot overflow.
        .text
main:   lui  $t0, 0x8000        # $t0 = -2147483648
        ble  $t0, 5, taken
        li   $a0, 0
        j    report
taken:  li   $a0, 1
report: li   $v0, 1
        syscall
        li   $v0, 10
        syscall
