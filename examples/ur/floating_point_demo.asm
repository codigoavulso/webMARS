#فلوٹنگ پوائنٹ ریپریزنٹیشن ٹول کے لیے فلوٹنگ پوائنٹ ٹیسٹ
#IEEE-754 بٹ پیٹرن کو $f12 میں لکھتا ہے اور انہیں فلوٹ ویلیو کے طور پر پرنٹ کرتا ہے۔

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #خام IEEE 754 بٹ پیٹرن، اعشاریہ نمبر نہیں

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #32 بٹ پیٹرن کو بطور انٹیجر پڑھیں
  mtc1 $t2, $f12   #اسی بٹس کو FPU میں منتقل کریں: کوئی تبدیلی نہیں ہوتی

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 پرنٹس $f12 کو فلوٹ کے طور پر پڑھا جاتا ہے
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #اگلا لفظ: ہر پیٹرن چار بائٹس پر قبضہ کرتا ہے۔
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
