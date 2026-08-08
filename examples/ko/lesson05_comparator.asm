# ==========================================================
#Lesson 05 - 비교기와 브랜치
#
#THE PROBLEM
#결정에는 1비트가 필요하지만 두 개의 32비트 숫자를 비교합니다.
#뺄셈이다. 뺄셈은 어떻게 선택이 되나요?
#
#WHAT THE HARDWARE DOES
#slt는 부호를 제외한 모든 것을 빼고 버립니다.
#0 또는 1을 씁니다. 그런 다음 분기는 해당 비트를 PC에 공급합니다.
#오프셋을 추가하거나 PC가 발전하도록 하는 로직입니다.
#
#THE SOLUTION
#레지스터와 비교하고 해당 레지스터에서 분기합니다. 제어
#흐름은 PC의 산술과 하나의 멀티플렉서입니다.
#
#WATCH FOR
#slt 이후, $t2는 1을 유지합니다. beq를 지나서 PC를 살펴보세요.
#상태 표시줄에서: 4만큼 전진하지 않고 점프합니다.
# ==========================================================
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
