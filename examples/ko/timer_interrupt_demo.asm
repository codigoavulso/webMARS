#webMARS 시스템 클럭 인터럽트 데모
#도구 > 시스템 시계 및 타이머를 열고 MIPS에 연결한 후 조립하고 실행합니다.
#결정론적 시뮬레이션 타이머는 200개의 명령어마다 프로그램을 중단합니다.

.eqv CLOCK_CONTROL 0xffff0050   #장치 레지스터는 MMIO 블록에 있습니다.
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #실행된 명령어에서 측정된 기간이므로 실행이 정확하게 반복됩니다.
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #비트 0은 타이머를 시작하고, 비트 1은 인터럽트를 발생시킵니다.
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main은 절대로 핸들러를 호출하지 않습니다. CPU는 자체적으로 핸들러로 점프합니다.
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #끝나기 전에 타이머를 멈춰
  li $v0, 4
  la $a0, message
  syscall
  li $v0, 1
  move $a0, $t2
  syscall
  li $v0, 11
  li $a0, 10
  syscall
  li $v0, 10
  syscall
.ktext 0x80000180
timer_handler:
  mfc0 $k0, $13
  andi $k0, $k0, 0x0400
  beq $k0, $zero, handler_done
  nop
  la $k1, ticks
  lw $k0, 0($k1)
  addiu $k0, $k0, 1
  sw $k0, 0($k1)
handler_done:
  eret
