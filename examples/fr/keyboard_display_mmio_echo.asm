#Clavier et écran MMIO Démo du simulateur
#Ouvrez Outils > Simulateur de clavier et d'affichage MMIO
#Tapez dans la zone inférieure du clavier ; les caractères sont répercutés dans la zone d’affichage supérieure.

.data
msg0: .asciiz "\n=== Keyboard/Display MMIO demo ===\n"
msg1: .asciiz "Open Tools > Keyboard and Display MMIO Simulator and connect to MIPS.\n"
msg2: .asciiz "Typed characters will be echoed by MMIO transmitter.\n"

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $s0, 0xffff         #MMIO base 0xFFFF0000

mmio_loop:
  #attendre le récepteur du clavier prêt (bit0 @ 0x0000)
wait_rx:
  lbu  $t0, 0x0000($s0)
  andi $t0, $t0, 1
  bne  $t0, $zero, receiver_ready
  nop
  li   $v0, 32             #coopérative 4 ms d'attente
  li   $a0, 4
  syscall
  b    wait_rx
  nop

receiver_ready:
  #lire char @ 0x0004
  lbu  $t1, 0x0004($s0)

  #attendre l'affichage de l'émetteur prêt (bit0 @ 0x0008)
wait_tx:
  lbu  $t2, 0x0008($s0)
  andi $t2, $t2, 1
  bne  $t2, $zero, transmitter_ready
  nop
  li   $v0, 32             #coopérative 4 ms d'attente
  li   $a0, 4
  syscall
  b    wait_tx
  nop

transmitter_ready:
  #écrire char @ 0x000C
  sb   $t1, 0x000c($s0)

  j mmio_loop
