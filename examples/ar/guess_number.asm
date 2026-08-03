#تخمين الرقم (1..100)
#يستخدم syscall 42 لإنشاء أرقام عشوائية وsyscall 5 لإدخال الأعداد الصحيحة.
#$s0 يحافظ على السر عبر مكالمات النظام؛ $s1 يقوم بحساب المحاولات عبر تكرارات الحلقة.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #معرف الدفق العشوائي للبذور = 1 مع بذرة عشوائية.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #عدد صحيح عشوائي في النطاق [0,100)، ثم انتقل إلى [1,100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #يقوم Syscall 42 بإرجاع القيمة التي تم إنشاؤها في $a0، وليس في $v0.
  addiu $s0, $a0, 1      #رقم سري
  li $s1, 0              #محاولات

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #قد تقوم Syscalls بالكتابة فوق سجلات الوسيطة/النتيجة، لذلك تظل الحالة المستمرة في سجلات $s.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #يتم إرجاع الإدخال الصحيح في $v0.
  move $t0, $v0          #تخمين
  addiu $s1, $s1, 1

  #إذا كان التخمين <سر => منخفضًا جدًا
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #إذا كان السر <تخمين => مرتفعًا جدًا
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #يساوي => الفوز
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #يتلاقى كلا فرعي التغذية الراجعة في التكرار التالي.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
