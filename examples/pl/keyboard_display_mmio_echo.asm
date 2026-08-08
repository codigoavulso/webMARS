#Klawiatura i wyświetlacz MMIO Demo symulatora
#Otwórz Narzędzia > Klawiatura i wyświetlacz MMIO Symulator
#Wpisz w dolnym obszarze klawiatury; znaki są wyświetlane w górnym obszarze wyświetlacza.

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

  lui $s0, 0xffff         #MMIO baza 0xFFFF0000

mmio_loop:
  #czekaj, odbiornik klawiatury będzie gotowy (bit0 @ 0x0000)
wait_rx:
  lbu  $t0, 0x0000($s0)
  andi $t0, $t0, 1
  bne  $t0, $zero, receiver_ready
  nop
  li   $v0, 32             #spółdzielnia 4 ms czekać
  li   $a0, 4
  syscall
  b    wait_rx
  nop

receiver_ready:
  #przeczytaj znak @ 0x0004
  lbu  $t1, 0x0004($s0)

  #czekaj wyświetl nadajnik gotowy (bit0 @ 0x0008)
wait_tx:
  lbu  $t2, 0x0008($s0)
  andi $t2, $t2, 1
  bne  $t2, $zero, transmitter_ready
  nop
  li   $v0, 32             #spółdzielnia 4 ms czekać
  li   $a0, 4
  syscall
  b    wait_tx
  nop

transmitter_ready:
  #napisz znak @ 0x000C
  sb   $t1, 0x000c($s0)

  j mmio_loop
