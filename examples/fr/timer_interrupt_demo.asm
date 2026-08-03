#webMARS Démo d'interruption de l'horloge système
#Ouvrez Outils > Horloge système et minuterie, connectez-le à MIPS, assemblez et exécutez.
#Une minuterie simulée déterministe interrompt le programme toutes les 200 instructions.

.eqv CLOCK_CONTROL 0xffff0050   #l'appareil s'enregistre en direct dans le bloc MMIO
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #période mesurée en instructions exécutées, de sorte que l'exécution se répète exactement
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #le bit 0 démarre le temporisateur, le bit 1 lui permet de déclencher des interruptions
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main n'appelle jamais le gestionnaire : le CPU y accède tout seul
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #arrêter le chronomètre avant de terminer
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
