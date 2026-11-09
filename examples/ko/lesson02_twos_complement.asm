# 02 - 2의 보수
#
# 32비트 2의 보수에서는 5의 비트를 반전시키고 1을 더하면 -5로 표현됩니다.
#
# 프로그램은 동일한 값을 0에서 `sub`, `nor` 및 `addi`라는 두 가지 방법으로 계산합니다.
#
# 두 경로 모두 -5를 인쇄합니다. 동일한 비트가 16진수로 어떻게 표시되는지 확인하려면 레지스터의 `0xFFFFFFFB`를 검사하세요.

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
