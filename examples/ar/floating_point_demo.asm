#اختبار النقطة العائمة لأداة تمثيل النقطة العائمة
#يكتب IEEE أنماط 754 بت في $f12 ويطبعها كقيم عائمة.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #أنماط 754 بت أولية IEEE، وليست أرقامًا عشرية

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #قراءة نمط 32 بت كعدد صحيح
  mtc1 $t2, $f12   #انقل نفس البتات إلى FPU: لا يحدث أي تحويل

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #يطبع syscall 2 $f12 قراءة على شكل عائم
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #الكلمة التالية: كل نمط يحتل أربع بايتات
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
