# 07 - 기억 속의 단어들
#
# 메모리 주소는 바이트 수를 계산합니다. 각 단어는 4바이트를 차지하므로 `lw` 및 `sw`는 여기서 오프셋 0, 4, 8을 사용합니다.
#
# 워드 주소는 4의 배수여야 합니다. 4 대신 오프셋 1을 사용하면 이 프로그램에서 정렬 예외가 발생합니다.
#
# Stores 다음으로 Data Segment에서 `cell`를 살펴보세요. 인접한 세 단어에는 111, 222, 333이 포함되어야 합니다.

        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #기본 주소

        #아래의 모든 오프셋은 $t0를 기준으로 하며 단어 정렬 상태를 유지합니다.
        li   $t1, 111
        sw   $t1, 0($t0)        #첫 번째 단어
        li   $t1, 222
        sw   $t1, 4($t0)        #+4바이트 = 다음 단어
        li   $t1, 333
        sw   $t1, 8($t0)        #+8바이트

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw는 이전에 sw가 작성한 동일한 32비트 값을 재구성합니다.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
