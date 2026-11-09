# 10 - 스택
#
# 관례적으로 스택은 낮은 주소를 향해 증가합니다. 두 단어를 위한 공간을 확보하려면 `$sp`에서 8을 뺍니다.
#
# 프로그램은 `sw`를 사용하여 두 개의 레지스터를 저장하고 이를 지운 다음 `lw`를 사용하여 해당 값을 복원합니다.
#
# `$sp` 예약 전, 두 매장 중, 출시 후 시청하세요. 최종 값은 초기 값과 일치해야 합니다.

        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #스택이 아래쪽으로 커지므로 $sp에서 할당이 뺍니다.
        addi $sp, $sp, -8       #두 단어 예약
        sw   $t0, 0($sp)        #푸시
        sw   $t1, 4($sp)

        li   $t0, 0             #레지스터를 두들겨 패다
        li   $t1, 0

        lw   $t0, 0($sp)        #팝
        lw   $t1, 4($sp)
        #호출자가 원본 $sp을 볼 수 있도록 모든 할당은 균형을 이루어야 합니다.
        addi $sp, $sp, 8        #릴리스

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
