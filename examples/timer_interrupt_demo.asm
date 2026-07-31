# System Clock interrupt demo for webMARS
#
# 1. Open Tools > System Clock and Timer and connect it to MIPS.
# 2. Assemble and run this file.
# 3. The program configures a simulated tick every 200 instructions.
#    The handler counts five timer interrupts and returns with eret.

.eqv CLOCK_CONTROL 0xffff0050
.eqv CLOCK_PERIOD  0xffff0058

.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "

.text
.globl main
main:
  li   $t0, CLOCK_PERIOD
  li   $t1, 200
  sw   $t1, 0($t0)
  li   $t0, CLOCK_CONTROL
  li   $t1, 3                 # enable timer + enable interrupt
  sw   $t1, 0($t0)

wait_for_ticks:
  lw   $t2, ticks
  blt  $t2, 5, wait_for_ticks
  nop

  sw   $zero, 0($t0)          # stop the timer before printing
  li   $v0, 4
  la   $a0, message
  syscall
  li   $v0, 1
  move $a0, $t2
  syscall
  li   $v0, 11
  li   $a0, 10
  syscall
  li   $v0, 10
  syscall

.ktext 0x80000180
timer_handler:
  mfc0 $k0, $13
  andi $k0, $k0, 0x0400      # timer is IP2 / Cause bit 10
  beq  $k0, $zero, handler_done
  nop
  la   $k1, ticks
  lw   $k0, 0($k1)
  addiu $k0, $k0, 1
  sw   $k0, 0($k1)
handler_done:
  eret
