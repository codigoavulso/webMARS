#webMARS سسٹم کلاک انٹرپٹ ڈیمو
#ٹولز > سسٹم کلاک اور ٹائمر کھولیں، اسے MIPS سے جوڑیں، جمع کریں اور چلائیں۔
#ایک متعین مصنوعی ٹائمر پروگرام کو ہر 200 ہدایات پر روکتا ہے۔

.eqv CLOCK_CONTROL 0xffff0050   #ڈیوائس رجسٹر MMIO بلاک میں رہتے ہیں۔
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #مدت کو پھانسی دی گئی ہدایات میں ماپا جاتا ہے، لہذا رن بالکل دہرایا جاتا ہے۔
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #bit 0 ٹائمر کو شروع کرتا ہے، bit 1 اسے مداخلتوں کو بڑھانے دیتا ہے۔
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #مین کبھی ہینڈلر کو کال نہیں کرتا ہے: CPU خود ہی اس پر چھلانگ لگاتا ہے
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #ختم کرنے سے پہلے ٹائمر بند کرو
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
