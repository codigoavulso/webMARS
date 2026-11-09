# 04 - 교대와 2의 거듭제곱
#
# 결과가 맞을 때 왼쪽 시프트에 3을 곱하고 8을 곱합니다. 가장자리를 지나 이동된 비트는 삭제됩니다.
#
# 오른쪽에서 `srl`는 0으로 채워지고 `sra`는 부호 비트를 복사합니다. -16을 2만큼 이동한 경우 각각 1073741820과 -4가 예상됩니다.
#
# `sra`로 -15를 시도해 보세요. 시프트가 반내림되므로 결과는 -4입니다. 부호 있는 나눗셈은 0으로 반올림됩니다.

        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #3개의 왼쪽 시프트는 2^3을 곱하고 32개의 결과 비트만 유지합니다.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #$t3와 $t4를 16진수로 비교하여 다른 수신 비트를 확인하세요.
        sra  $t3, $t2, 2        #부호 보존: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #0이 이동됨: 엄청난 양수
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
