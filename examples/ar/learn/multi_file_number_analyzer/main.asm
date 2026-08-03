#مثال متعدد الملفات: الوحدة الرئيسية
#أبقِ هذا الملف نشطًا واضغط على "تجميع".
#تقوم التوجيهات .include أدناه بسحب الملفين الآخرين.
#- يقوم parity.asm بإرجاع رسالة تخبرك ما إذا كان الرقم زوجيًا أم فرديًا
#- يقوم prime.asm بإرجاع 1 في $v0 عندما يكون الرقم أوليًا
#
#التدفق:
#1. اطلب رقمًا في [1,100] أو 0 للخروج
#2. اطبع ما إذا كان الرقم زوجيًا أم فرديًا
#3. اطبع ما إذا كان الرقم أوليًا
#4. كرر

.data
#تمتلك هذه الوحدة سلاسل تواجه المستخدم؛ تمتلك الوحدات المساعدة بياناتها/رمزها الخاص.
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
  #يقوم Syscall 5 بإرجاع العدد الصحيح الذي تم إدخاله في $v0.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #التحقق من صحة الحدود الدنيا والعليا مع المقارنات الموقعة.
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
  #اصطلاح الاستدعاء o32: وسيطة في $a0، مؤشر النتيجة في $v0.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #تقوم الوحدة الثانية بإرجاع قيمة منطقية في $v0.
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

#يتم حل التضمينات من ملفات المشروع أثناء التجميع.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
