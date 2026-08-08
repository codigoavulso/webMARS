#webMARS Demo dell'interruzione dell'orologio di sistema
#Apri Strumenti > Orologio e timer di sistema, collegalo a MIPS, assembla ed esegui.
#Un timer simulato deterministico interrompe il programma ogni 200 istruzioni.

.eqv CLOCK_CONTROL 0xffff0050   #i registri del dispositivo vivono nel blocco MMIO.
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #periodo misurato in istruzioni eseguite, quindi l'esecuzione si ripete esattamente
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #il bit 0 avvia il timer, il bit 1 gli consente di generare interruzioni
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main non chiama mai il gestore: CPU salta ad esso da solo
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #fermare il timer prima di finire
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
