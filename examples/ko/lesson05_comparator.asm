# 05 - 비교기와 분기
#
# `slt` 두 개의 부호 있는 정수를 비교하여 첫 번째 정수가 작으면 1을 쓰고, 그렇지 않으면 0을 씁니다.
#
# 7과 12의 경우 `$t2`는 1이므로 `beq`는 `notless`로 점프하지 않고 다음 명령어까지 실행이 계속됩니다.
#
# 지연 분기를 사용하여 `beq`를 지나서 PC를 관찰하세요. 두 입력 값을 교환하고 새 대상을 비교합니다.

        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #에
        li   $t1, 12            #비
        #slt는 비교를 숨겨진 플래그가 아닌 일반 정수로 구체화합니다.
        slt  $t2, $t0, $t1      #a < b인 경우 t2 = 1
        #부울 결과가 0인 경우에만 Notless로 분기합니다.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
