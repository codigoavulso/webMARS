#نمبر کا اندازہ لگائیں (1..100)
#بے ترتیب نمبر بنانے کے لیے syscall 42 اور انٹیجر ان پٹ کے لیے syscall 5 استعمال کرتا ہے۔
#$s0 syscalls میں راز رکھتا ہے؛ $s1 لوپ کی تکرار میں کوششوں کو شمار کرتا ہے۔

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #صوابدیدی بیج کے ساتھ سیڈ رینڈم اسٹریم id=1۔
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #رینڈم انٹیجر [0,100] میں، پھر [1,100] پر شفٹ کریں۔
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 $a0 میں پیدا کردہ قدر واپس کرتا ہے، $v0 میں نہیں۔
  addiu $s0, $a0, 1      #خفیہ نمبر
  li $s1, 0              #کوششیں

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Syscalls دلیل/نتائج کے رجسٹر کو اوور رائٹ کر سکتے ہیں، اس لیے مستقل حالت $s رجسٹروں میں رہتی ہے۔
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #انٹیجر ان پٹ $v0 میں لوٹا جاتا ہے۔
  move $t0, $v0          #اندازہ لگانا
  addiu $s1, $s1, 1

  #اگر اندازہ ہے < خفیہ => بہت کم
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #اگر خفیہ < guess => بہت زیادہ ہے۔
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #برابر => جیت
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
  #دونوں آراء کی شاخیں اگلی تکرار پر اکٹھی ہوجاتی ہیں۔
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
