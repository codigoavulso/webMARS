#ملٹی فائل مثال: مین ماڈیول
#اس فائل کو ایکٹو رکھیں اور اسمبل کو دبائیں۔
#.include نیچے دی گئی ہدایات دیگر دو فائلوں کو کھینچتی ہیں۔
#- parity.asm ایک پیغام لوٹاتا ہے جس میں بتایا گیا ہے کہ نمبر یکساں ہے یا طاق
#- prime.asm نمبر پرائم ہونے پر $v0 میں 1 لوٹاتا ہے
#
#بہاؤ:
#1. باہر نکلنے کے لیے [1,100]، یا 0 میں نمبر طلب کریں۔
#2. پرنٹ کریں چاہے نمبر برابر ہو یا طاق
#3. پرنٹ کریں کہ آیا نمبر پرائم ہے۔
#4. دہرائیں۔

.data
#یہ ماڈیول صارف کا سامنا کرنے والے تاروں کا مالک ہے۔ مددگار ماڈیول اپنے نجی ڈیٹا/کوڈ کے مالک ہیں۔
title:         .asciiz "\n=== Multi-file number analyzer ===\n"
hint:          .asciiz "This example uses 3 separate files assembled together.\n"
prompt:        .asciiz "Enter a number [1..100] (0 to exit): "
invalid_msg:   .asciiz "Please enter a value between 1 and 100.\n"
result_prefix: .asciiz "Number "
parity_prefix: .asciiz " is "
prime_yes_msg: .asciiz " and it is prime.\n"
prime_no_msg:  .asciiz " and it is not prime.\n"
goodbye_msg:   .asciiz "Bye!\n"

.text
.globl main
main:
  li $v0, 4
  la $a0, title
  syscall

  li $v0, 4
  la $a0, hint
  syscall

input_loop:
  #Syscall 5 $v0 میں درج کردہ عدد کو لوٹاتا ہے۔
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #دستخط شدہ موازنہ کے ساتھ نچلے اور اوپری حدود کی توثیق کریں۔
  slti $t0, $s0, 1
  bne $t0, $zero, invalid_input
  nop

  slti $t0, $s0, 101
  beq $t0, $zero, invalid_input
  nop

  li $v0, 4
  la $a0, result_prefix
  syscall

  li $v0, 1
  #o32 کال کنونشن: $a0 میں دلیل، $v0 میں نتیجہ پوائنٹر۔
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #دوسرا ماڈیول $v0 میں بولین لوٹاتا ہے۔
  move $a0, $s0
  jal get_parity_message
  nop

  move $s1, $v0
  li $v0, 4
  move $a0, $s1
  syscall

  move $a0, $s0
  jal is_prime
  nop

  bne $v0, $zero, print_prime_yes
  nop

  li $v0, 4
  la $a0, prime_no_msg
  syscall
  j input_loop
  nop

print_prime_yes:
  li $v0, 4
  la $a0, prime_yes_msg
  syscall
  j input_loop
  nop

invalid_input:
  li $v0, 4
  la $a0, invalid_msg
  syscall
  j input_loop
  nop

exit_program:
  li $v0, 4
  la $a0, goodbye_msg
  syscall

  li $v0, 10
  syscall

#پراجیکٹ فائلوں سے اسمبلی کے دوران حل کیے جاتے ہیں۔
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
