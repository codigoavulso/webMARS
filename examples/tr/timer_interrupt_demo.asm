#webMARS Sistem Saati kesintisi demosu
#Araçlar > Sistem Saati ve Zamanlayıcı'yı açın, onu MIPS'e bağlayın, birleştirin ve çalıştırın.
#Deterministik simüle edilmiş bir zamanlayıcı, her 200 talimatta bir programı kesintiye uğratır.

.eqv CLOCK_CONTROL 0xffff0050   #cihaz kayıtları MMIO bloğunda canlı olarak yer alır
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #yürütülen talimatlarda ölçülen süre, böylece çalıştırma tam olarak tekrarlanır
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #bit 0 zamanlayıcıyı başlatır, bit 1 kesintileri artırmasına izin verir
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main asla işleyiciyi çağırmaz: CPU ona kendi başına atlar
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #bitirmeden önce zamanlayıcıyı durdurun
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
