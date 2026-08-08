# ==========================================================
#레슨 15 - 보폭이 속도를 바꾸는 이유
#
#THE PROBLEM
#아래의 두 루프는 동일한 배열을 읽고 동일한 작업을 수행합니다.
#로드 수. 실제 머신에서는 훨씬 느립니다. 는
#명령어 수는 설명할 수 없습니다.
#
#WHAT THE HARDWARE DOES
#기억은 한 단어도 전달하지 않습니다. 실수가 전체를 가져온다
#블록, 이웃 단어가 곧 필요해질 것이라고 확신합니다.
#한 걸음 더 나아가 그 베팅을 수집합니다. 16개의 월급
#블록에 대해 한 단어를 읽습니다.
#
#THE SOLUTION
#코드에는 아무것도 변경되지 않습니다. 지역성은 그 사람의 재산이다.
#접근 패턴인데, 고쳐야 할 패턴입니다.
#
#WATCH FOR
#도구 > 데이터 캐시 시뮬레이터를 열고 MIPS에 연결을 누릅니다.
#그런 다음 실행하십시오. 두 루프의 적중률을 비교합니다. 두 합계
#배열이 0이므로 0을 인쇄합니다. 숫자는 숫자가 아닙니다.
#여기서 포인트는 적중률입니다.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
#---- 각 블록의 모든 단어 ----
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #순차 인덱스는 계속 진행하기 전에 각 캐시 블록의 단어를 재사용합니다.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

#---- 블록당 하나의 단어, 16개의 단어 간격 ----
        li   $t1, 0
        li   $t3, 0
far:
        #16개를 추가하면 반복당 64바이트를 건너뜁니다. 일반적으로 하나의 전체 캐시 블록입니다.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
