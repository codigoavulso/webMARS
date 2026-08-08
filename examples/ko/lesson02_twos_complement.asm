# ==========================================================
#Lesson 02 - 2의 보수
#
#THE PROBLEM
#레지스터는 32개의 와이어로 구성되며 각각은 높거나 낮습니다. 철사가 없습니다
#빼기 기호의 경우 음수가 작동해야 합니다.
#
#WHAT THE HARDWARE DOES
#상위 비트를 기호로 읽지만 별도의 플래그로 읽지는 않습니다.
#-n은 n에 추가되어 다음으로 래핑되는 비트 패턴으로 저장됩니다.
#제로. 모든 비트를 반전시키고 하나를 추가하면 됩니다.
#
#THE SOLUTION
#빼기에는 두 번째 회로가 필요하지 않습니다. a - b는
#a + (-b)이므로 하나의 가산기가 두 작업을 모두 수행합니다.
#
#WATCH FOR
#두 반쪽 모두 -5를 인쇄합니다. 두 번째는 먼 길에 도달하고,
#nor 및 addi를 사용하여 sub가 내부적으로 수행하는 작업을 보여줍니다.
#0xFFFFFFFB을 보려면 값을 16진수로 설정하세요.
# ==========================================================
        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #0에서 빼면 빼기 부호 비트 없이 덧셈의 역원이 형성됩니다.
        li   $t0, 5
        sub  $t1, $zero, $t0    #가산기가 작업을 수행합니다
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #$zero도 비트 단위 NOT가 아닙니다. 1을 추가하면 2의 보수가 완성됩니다.
        nor  $t2, $t0, $zero    #모든 비트를 반전
        addi $t2, $t2, 1        #하나 추가
        move $a0, $t2           #위와 같은 값
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
