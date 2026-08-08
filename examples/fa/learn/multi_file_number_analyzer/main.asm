#مثال چند فایل: ماژول اصلی
#این فایل را فعال نگه دارید و Assemble را فشار دهید.
#دستورالعمل های .include زیر دو فایل دیگر را می کشد.
#- parity.asm پیامی را برمی گرداند که نشان می دهد عدد زوج است یا فرد
#- prime.asm وقتی عدد اول است، 1 اینچ $v0 را برمی‌گرداند
#
#جریان:
#1. برای خروج یک عدد در [1100] یا 0 بخواهید
#2. زوج یا فرد بودن عدد را چاپ کنید
#3. اول بودن عدد را چاپ کنید
#4. تکرار کنید

.data
#این ماژول دارای رشته های رو به کاربر است. ماژول های کمکی مالک داده/کد خصوصی خود هستند.
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
  #Syscall 5 عدد صحیح وارد شده را در $v0 برمی گرداند.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #کران های پایین و بالایی را با مقایسه های امضا شده اعتبار سنجی کنید.
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
  #قرارداد فراخوانی o32: آرگومان در $a0، نشانگر نتیجه در $v0.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #ماژول دوم یک بولی را در $v0 برمی‌گرداند.
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

#شامل از فایل های پروژه در طول مونتاژ حل و فصل می شود.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
