# 09 - 배열 인덱싱
#
# 각 배열 요소는 4바이트를 차지합니다. 인덱스를 왼쪽으로 2만큼 이동하여 바이트 오프셋을 계산합니다.
#
# `sll`, `add`, `lw` 순서를 따르세요. 인덱스 크기를 조정하고 기본 주소를 추가하고 요소를 로드합니다.
#
# 인덱스 2에서 `$t5`는 8이고 `$t6`는 값 30을 가리킵니다. 5개 요소의 합은 150입니다.

        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #베이스
        li   $t1, 0             #나
        li   $t2, 5             #길이
        li   $t3, 0             #누산기

sum:
        #루프 불변: $t3는 arr[0]부터 arr[i-1]까지의 합계입니다.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #나는 * 4바이트
        add  $t6, $t0, $t5      #기본 + 스케일 인덱스
        #$t6 이제 정확히 하나의 요소 이름이 지정됩니다. lw는 32비트 값을 가져옵니다.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
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
