# 11 - 함수 호출
#
# 지연된 분기를 실행합니다. `jal`는 해당 함수로 점프하고 다음 명령어의 주소를 `$ra`에 넣습니다.
#
# 호출 규칙은 `$a0` 및 `$a1`에서 17과 42를 통과합니다. 이 함수는 `$v0`에서 더 큰 값을 반환합니다.
#
# 통화에 들어가서 `$ra`를 `jal` 뒤의 주소와 비교한 다음 `jr $ra`를 따라 발신자에게 돌아갑니다.

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #첫 번째 인수
        li   $a1, 42            #두 번째 인수
        jal  maxof

        move $a0, $v0           #결과가 $v0에 반환되었습니다.
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof는 리프 함수이므로 스택에 $ra를 저장하지 않고도 반환할 수 있습니다.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
