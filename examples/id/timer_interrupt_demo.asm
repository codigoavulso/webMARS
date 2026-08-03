#webMARS Demo interupsi Jam Sistem
#Buka Tools > System Clock and Timer, sambungkan ke MIPS, rakit dan jalankan.
#Timer simulasi deterministik menginterupsi program setiap 200 instruksi.

.eqv CLOCK_CONTROL 0xffff0050   #register perangkat berada di blok MMIO
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #periode yang diukur dalam instruksi yang dieksekusi, sehingga proses diulangi dengan tepat
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #bit 0 memulai pengatur waktu, bit 1 mengaktifkan interupsi
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main tidak pernah memanggil handler: CPU melompat ke sana dengan sendirinya
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #hentikan pengatur waktu sebelum selesai
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
