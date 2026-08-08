# ==========================================================
#레슨 11 - 함수 호출
#
#THE PROBLEM
#루틴에 뛰어드는 것은 쉽습니다. 돌아 오는 것은 아니기 때문에
#동일한 루틴이 여러 곳에서 호출될 수 있으며
#반품 주소는 매번 다릅니다.
#
#WHAT THE HARDWARE DOES
#jal은 하나의 명령으로 두 가지 작업을 수행합니다.
#$ra에서 다음 명령어의 주소를 입력한 후 점프합니다. 주니어
#레지스터에 있는 모든 항목으로 점프하므로 jr $ra가 반환됩니다.
#
#THE SOLUTION
#다른 모든 것은 회로가 아니라 합의입니다.
#$a0..$a3, 결과는 $v0입니다. 관습과 코드를 깨뜨려라
#여전히 조립됩니다. 단순히 상호 운용이 중지됩니다.
#
#WATCH FOR
#jal에 올라 $ra를 읽어보세요. 주소와 비교해 보세요
#Text Segment에서 통화 후 라인의 내용입니다.
# ==========================================================
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
        #jal은 하나의 아키텍처 작업으로 제어 흐름과 $ra을 모두 변경합니다.
        jal  maxof              #$ra = 다음 줄의 주소

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
