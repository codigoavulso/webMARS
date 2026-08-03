#استعادة العرض التوضيحي لمعالج الاستثناء.
#يثير المتجر غير المحاذي خطأ في العنوان (المتجر). يسجل المعالج
#السبب، EPC وBadVAddr، يتخطيان التعليمات المسببة للخطأ ويعودان مع ERET.

.data
recovered:     .asciiz "Recovered from the exception.\n"
cause_label:   .asciiz "Cause: "
epc_label:     .asciiz "EPC: "
badvaddr_label:.asciiz "BadVAddr: "
newline:       .asciiz "\n"
saved_cause:   .word 0
saved_epc:     .word 0
saved_badvaddr:.word 0

.text
main:
  li $t0, 0x12345678
  #العنوان 1 غير محاذي للكلمات، لذلك هناك خطأ متعمد في هذه التعليمات.
  sw $t0, 1($zero)

  #يتم استئناف التنفيذ هنا بعد أن يتقدم المعالج EPC بتعليمة واحدة.
  li $v0, 4
  la $a0, recovered
  syscall

  la $a0, cause_label
  syscall
  lw $a0, saved_cause
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, epc_label
  syscall
  lw $a0, saved_epc
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, badvaddr_label
  syscall
  lw $a0, saved_badvaddr
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

.ktext 0x80000180
exception_handler:
  #CP0 التسجيل 13 = السبب، 14 = EPC، 8 = BadVAddr.
  #تعمل سجلات Kernel $k0/$k1 على تجنب إتلاف سجلات المستخدم التي تمت مقاطعتها.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #تخطي التعليمات المعروفة ذات الـ 4 بايت المسببة للخطأ؛ إعادة المحاولة من شأنه أن خطأ إلى الأبد.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
