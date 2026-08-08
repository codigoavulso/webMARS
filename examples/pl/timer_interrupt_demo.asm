#webMARS Demo przerwania zegara systemowego
#Otwórz Narzędzia > Zegar systemowy i timer, podłącz go do MIPS, zmontuj i uruchom.
#Deterministyczny symulowany timer przerywa program co 200 instrukcji.

.eqv CLOCK_CONTROL 0xffff0050   #rejestry urządzeń znajdują się w bloku MMIO.
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #okres mierzony w wykonanych instrukcjach, więc przebieg jest dokładnie powtarzany
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #bit 0 uruchamia licznik czasu, bit 1 pozwala mu zgłaszać przerwania
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main nigdy nie wywołuje procedury obsługi: CPU przeskakuje do niego samodzielnie
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #zatrzymaj stoper przed zakończeniem
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
