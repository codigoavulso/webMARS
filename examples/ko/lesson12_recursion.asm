# ==========================================================
#12단원 - 재귀에는 호출당 프레임이 필요합니다.
#
#THE PROBLEM
#재귀 호출은 $ra 및 인수 레지스터를 덮어씁니다.
#그러면 외부 호출은 돌아갈 길이 없으며 그것이 무엇인지 전혀 모릅니다.
#자신의 n은이었다.
#
#WHAT THE HARDWARE DOES
#스택이 아닌 하나의 $ra을 제공합니다. 아무것도 저장되지 않았습니다
#자동으로; 코드가 저장하지 않으면 사라집니다.
#
#THE SOLUTION
#활성화할 때마다 스택의 프레임이 열리고 그 프레임이 유지됩니다.
#통화 후에도 여전히 필요하며 도중에 복원됩니다.
#밖으로. 스택 깊이는 재귀 깊이입니다.
#
#WATCH FOR
#mul에 중단점을 설정하고 $sp가 8씩 하강하는 것을 확인합니다.
#수준. n의 저장된 5개 복사본은 다음을 만드는 것입니다.
#돌아오는 길에 곱셈도 가능.
# ==========================================================
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
        #호출 수신자 상태를 복원하고 항목에 할당된 프레임을 정확하게 폐기합니다.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
