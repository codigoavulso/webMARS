#webMARS Демонстрация прерывания системных часов
#Откройте «Инструменты» > «Системные часы и таймер», подключите его к MIPS, соберите и запустите.
#Детерминированный моделируемый таймер прерывает программу каждые 200 инструкций.

.eqv CLOCK_CONTROL 0xffff0050   #регистры устройств находятся в блоке MMIO
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #период измеряется в выполненных инструкциях, поэтому выполнение повторяется точно
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #бит 0 запускает таймер, бит 1 позволяет вызывать прерывания
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main никогда не вызывает обработчик: CPU переходит к нему самостоятельно
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #остановить таймер перед окончанием
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
