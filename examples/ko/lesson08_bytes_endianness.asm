# ==========================================================
#Lesson 08 - 단어 안의 바이트와 바이트 순서
#
#THE PROBLEM
#한 단어는 4개의 주소를 차지합니다. 어느 바이트가 가장 낮은 값을 수행합니까?
#그 주소 이름 중?
#
#WHAT THE HARDWARE DOES
#그 선택은 바이트 순서이며, 배선 결정입니다.
#전체 기계에 대해 한 번. MIPS 여기 리틀 엔디안이 있습니다.
#최하위 바이트는 가장 낮은 주소에 있습니다.
#
#THE SOLUTION
#한 단어를 저장한 다음 한 번에 한 바이트씩 다시 읽어서
#순서는 당신을 위한 질문에 대답합니다.
#
#WATCH FOR
#0x04030201는 1 2 3 4로 돌아옵니다.
#리터럴을 먼저 읽습니다. lb 대신 lbu가 사용되므로
#127보다 큰 바이트는 부호 확장되지 않습니다.
# ==========================================================
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
