# 03 - 32비트 이상의 논리 게이트
#
# 각 결과 비트는 두 피연산자의 해당 비트에만 의존합니다. 비트 위치 사이에는 캐리가 없습니다.
#
# 마스크 `0x0F`를 사용하면 AND 하위 4비트를 유지하고 나머지는 지웁니다. OR는 하위 4비트를 설정하고 XOR은 이를 뒤집습니다.
#
# 세 가지 결과를 16진수로 비교한 다음 마스크 `0xF0`를 시도하여 다음 4비트 그룹에 대해 작업합니다.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F 마스크

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND 마스크에 0이 포함된 모든 위치를 지웁니다.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR는 마스크에서 선택된 위치만 토글합니다.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
