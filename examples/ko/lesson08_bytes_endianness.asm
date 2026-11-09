# 08 - 바이트 및 바이트 순서
#
# 이 시뮬레이터의 리틀 엔디안 메모리에서는 단어의 최하위 바이트가 가장 낮은 주소에 있습니다.
#
# `0x04030201`를 단어로 저장하고 오프셋 0~3을 바이트로 읽습니다. 출력은 1, 2, 3, 4입니다.
#
# `0xFF`의 낮은 바이트를 사용해 보세요. `lbu`로 서명되지 않은 로드는 255를 제공하고 `lb`로 서명된 로드는 -1을 제공합니다.

        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #바이트 01은 최하위입니다
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #바이트 오프셋
bloop:
        #루프는 저장된 단어 내부의 오프셋 0, 1, 2 및 3을 방문합니다.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #유효 주소 = 기본 주소 + 현재 바이트 오프셋.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #부호 없는 바이트
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
