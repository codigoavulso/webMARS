# 12 - 재귀와 프레임
#
# 재귀 호출은 `$ra`를 덮어쓰고 자체 인수로 `$a0`을 사용합니다. 전화를 걸기 전에 두 값을 모두 저장하세요.
#
# 5에서 1 사이의 각 값에 대해 `fact`로 들어갑니다. 모든 호출은 1을 반환하는 호출을 포함하여 8바이트를 예약합니다.
#
# 반환 경로를 보려면 `mul`에 중단점을 설정하세요. 각 호출은 자체 인수를 다시 로드하고 해당 프레임을 곱하고 해제합니다.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int 사실(int n) ----
fact:
        #각 호출은 고유한 8바이트 프레임을 소유합니다.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #이 통화의 반송 주소
        sw   $a0, 4($sp)        #이 전화는 n이야

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #기본 사례: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #우리 n을 다시
        mul  $v0, $v0, $a0

factend:
        # 이 호출의 프레임을 해제하기 전에 저장된 반환 주소를 복원하십시오.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
