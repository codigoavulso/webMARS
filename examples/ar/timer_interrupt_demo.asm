#webMARS العرض التوضيحي لمقاطعة ساعة النظام
#افتح الأدوات > ساعة النظام والمؤقت، وقم بتوصيله بـ MIPS، ثم قم بتجميعه وتشغيله.
#يقوم جهاز ضبط الوقت المحاكي الحتمي بمقاطعة البرنامج كل 200 تعليمات.

.eqv CLOCK_CONTROL 0xffff0050   #سجلات الجهاز موجودة في كتلة MMIO
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #يتم قياس الفترة الزمنية في التعليمات المنفذة، بحيث يتكرر التشغيل تمامًا
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #البت 0 يبدأ المؤقت، أما البت 1 فيسمح له برفع المقاطعات
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main لا يستدعي المعالج مطلقًا: يقفز CPU إليه من تلقاء نفسه
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #أوقف المؤقت قبل الانتهاء
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
