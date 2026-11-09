# 15 - 보폭이 속도를 바꾸는 이유
#
# 두 루프 모두 동일한 배열을 사용합니다. 첫 번째는 256개의 단어를 모두 읽습니다. 두 번째는 16번째 단어마다 읽어서 16번만 로드합니다.
#
# 16개 단어의 캐시 블록을 사용하면 순차적 읽기에서 가져온 각 블록을 재사용할 수 있습니다. 두 번째 루프는 로드할 때마다 새 블록으로 진행됩니다.
#
# 시뮬레이터를 MIPS에 연결하고 «활성화됨»을 선택한 후 블록 크기를 16워드로 설정합니다.
# 데이터 캐시 시뮬레이터를 `far`에 중단점과 함께 사용하여 첫 번째 루프를 검사합니다. 두 번째 루프를 실행하기 전에 캐시 통계를 재설정하고 적중률을 비교하십시오.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# 순차 패스: 전체 256 단어.
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

# 스트라이드 패스: 16단어당 하나의 로드입니다.
        li   $t1, 0
        li   $t3, 0
far:
        # 다음 주소는 64바이트 떨어져 있습니다. 각각 4바이트에 16개의 단어가 있습니다.
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
