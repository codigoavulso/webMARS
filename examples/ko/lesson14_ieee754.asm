# 14 - 32비트 실수
#
# 단정밀도 부동소수점에는 부호 비트 1개, 지수 비트 8개, 분수 비트 23개가 있습니다.
#
# `lwc1` 비트 패턴을 부동 소수점 레지스터에 복사합니다. 그런 다음 `add.s`는 3.5와 1.25를 더해 4.75를 생성합니다.
#
# 부동 소수점 표현 도구에서 4.75와 0.1의 인코딩을 비교하세요. 4.75가 정확합니다. 0.1은 반올림이 필요합니다.

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #FPU 레지스터 파일에
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #FPU 가산기

        #Syscall 2는 특히 $f12에서 float 인수를 기대합니다.
        mov.s $f12, $f4
        li   $v0, 2             #플로트 인쇄
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
