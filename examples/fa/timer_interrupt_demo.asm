#webMARS نمایش وقفه ساعت سیستم
#Tools > System Clock and Timer را باز کنید، آن را به MIPS متصل کنید، مونتاژ کرده و اجرا کنید.
#یک تایمر شبیه سازی قطعی هر 200 دستورالعمل برنامه را قطع می کند.

.eqv CLOCK_CONTROL 0xffff0050   #ثبت دستگاه به صورت زنده در بلوک MMIO است
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #دوره در دستورالعمل های اجرا شده اندازه گیری می شود، بنابراین اجرا دقیقا تکرار می شود
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #بیت 0 تایمر را شروع می کند، بیت 1 اجازه می دهد تا وقفه ها را افزایش دهد
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main هرگز با کنترل کننده تماس نمی گیرد: CPU خود به خود به آن می پرد
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #قبل از اتمام تایمر را متوقف کنید
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
