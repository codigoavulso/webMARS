#مضروب عودي (الكلية الكلاسيكية)
#يقرأ ن ويطبع ن! (للصغير ن).

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n موجود في $a0؛ تظهر النتيجة في $v0
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#حقيقة كثافة العمليات (كثافة العمليات ن)
fact:
  addiu $sp, $sp, -8   #إطار واحد لكل مكالمة: كلمتين
  sw    $ra, 4($sp)   #احفظ عنوان المرسل قبل الاتصال مرة أخرى
  sw    $a0, 0($sp)   #احتفظ بـ n: تتم الكتابة فوق المكالمة العودية $a0

  blez  $a0, fact_base   #حالة التوقف: بدونها لا تنحل المكدس أبدًا
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #لدينا ن مرة أخرى، بمنأى عن المكالمة أدناه
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #قم باستعادة الإطار وتحريره قبل العودة
  addiu $sp, $sp, 8
  jr    $ra
