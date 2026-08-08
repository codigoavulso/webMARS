# ==========================================================
#Lesson 03 - 32비트에 걸친 논리 게이트
#
#THE PROBLEM
#AND, OR 및 XOR는 1비트 게이트입니다. 레지스터는 32비트를 보유합니다.
#그 너비에서 게이트는 무엇을 의미합니까?
#
#WHAT THE HARDWARE DOES
#32개의 문 사본이 나란히 놓여 있습니다. 비트 0
#결과는 각 피연산자의 비트 0에만 의존하고 비트 1은
#비트 1 등. 그들 사이에는 캐리 여행이 없습니다.
#
#THE SOLUTION
#그 독립성은 마스크를 작동하게 만드는 것입니다. 어느 것을 선택하십시오
#AND로 유지할 비트를 OR로 1로 강제하고 XOR로 뒤집습니다.
#
#WATCH FOR
#0xCC는 11001100이고 마스크 0x0F는 00001111입니다. AND는
#낮은 4개 비트를 OR 설정하고 XOR 뒤집습니다. 오직
#낮은 니블은 항상 변경됩니다.
# ==========================================================
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
