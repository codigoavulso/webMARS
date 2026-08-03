#মাল্টি-ফাইল উদাহরণ: প্রধান মডিউল
#এই ফাইলটি সক্রিয় রাখুন এবং অ্যাসেম্বল টিপুন।
#নিচের .include নির্দেশাবলী অন্য দুটি ফাইলে টান।
#- parity.asm সংখ্যাটি জোড় বা বিজোড় কিনা তা বলে একটি বার্তা ফেরত দেয়
#- prime.asm সংখ্যা প্রাইম হলে $v0 এর মধ্যে 1 প্রদান করে
#
#প্রবাহ:
#1. প্রস্থান করার জন্য [1,100], বা 0 এ একটি সংখ্যার জন্য জিজ্ঞাসা করুন
#2. সংখ্যাটি জোড় বা বিজোড় কিনা তা প্রিন্ট করুন
#3. সংখ্যাটি মৌলিক কিনা তা প্রিন্ট করুন
#4. পুনরাবৃত্তি করুন

.data
#এই মডিউলটি ব্যবহারকারী-মুখী স্ট্রিংগুলির মালিক; সহায়ক মডিউল তাদের ব্যক্তিগত ডেটা/কোডের মালিক।
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
  #Syscall 5 $v0 এ প্রবেশ করা পূর্ণসংখ্যা প্রদান করে।
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #স্বাক্ষরিত তুলনা সহ নিম্ন এবং উপরের সীমানা যাচাই করুন।
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
  #o32 কল কনভেনশন: $a0-এ আর্গুমেন্ট, $v0-এ ফলাফল পয়েন্টার।
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #দ্বিতীয় মডিউলটি $v0 এ একটি বুলিয়ান প্রদান করে।
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

#সমাবেশের সময় প্রকল্প ফাইল থেকে সমাধান করা হয় অন্তর্ভুক্ত.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
