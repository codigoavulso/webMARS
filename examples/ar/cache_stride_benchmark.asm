#معيار سلوك ذاكرة التخزين المؤقت: الوصول المتسلسل مقابل الوصول إلى الخطوة 16.
#افتح الأدوات > أداة محاكاة ذاكرة التخزين المؤقت للبيانات، وقم بتوصيلها بـ MIPS، وحدد تمكين.
#
#يقيس كل تنفيذ نمطًا واحدًا من ذاكرة التخزين المؤقت الباردة بالضبط. تعيين ACCESS_PATTERN
#إلى 1 أو 2، قم بإعادة ضبط إحصائيات المحاكاة، ثم قم بالتجميع والتشغيل مرة أخرى.
#كلا النموذجين يؤديان 1024 حملاً؛ لا توجد عمليات كتابة تهيئة تلوث البيانات.

.eqv ACCESS_PATTERN 1    #1 = متسلسل، 2 = خطوة 16 كلمة
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #النمط 1: العناوين التسلسلية.
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #النمط 2: قم بزيارة كل 16 كلمة، ثم قم بتقديم إزاحة البداية.
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
