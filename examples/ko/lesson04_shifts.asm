# ==========================================================
#레슨 04 - 교대 또는 와이어로 곱하기
#
#THE PROBLEM
#일반 승수는 가장 비싼 블록 중 하나입니다.
#데이터 경로. 8을 곱하면 그렇게 많은 비용이 들지 않습니다.
#
#WHAT THE HARDWARE DOES
#시프트는 전혀 산술적이지 않습니다. 동일한 비트를 읽습니다.
#다른 전선에서. n만큼 왼쪽으로 이동하면 2^n이 곱해집니다.
#라우팅 비용만 발생합니다.
#
#THE SOLUTION
#2의 거듭제곱은 교대가 됩니다. 두 개의 오른쪽 시프트에 주목하세요: srl
#상단에 0을 입력하고 sra는 부호 비트를 복사하므로
#sra는 음수를 올바르게 나눕니다.
#
#WATCH FOR
#-16 >> 2는 sra의 경우 -4를 제공하지만 srl의 경우 매우 긍정적입니다. 는
#비트는 동일하게 움직였습니다. 맨 위에 입력한 내용만 다릅니다.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #3개의 왼쪽 시프트는 2^3을 곱하고 32개의 결과 비트만 유지합니다.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #$t3와 $t4를 16진수로 비교하여 다른 수신 비트를 확인하세요.
        sra  $t3, $t2, 2        #부호 보존: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #0이 이동됨: 엄청난 양수
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
