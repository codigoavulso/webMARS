#সংখ্যা অনুমান করুন (1..100)
#র্যান্ডম সংখ্যা তৈরির জন্য syscall 42 এবং পূর্ণসংখ্যা ইনপুটের জন্য syscall 5 ব্যবহার করে।
#$s0 syscalls জুড়ে গোপন রাখে; $s1 লুপ পুনরাবৃত্তি জুড়ে প্রচেষ্টা গণনা করে।

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #একটি নির্বিচারে বীজ সহ র্যান্ডম স্ট্রিম id=1 বীজ।
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #পরিসরে এলোমেলো পূর্ণসংখ্যা [0,100), তারপরে [1,100] এ স্থানান্তর করুন।
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 $a0-এ উত্পন্ন মান প্রদান করে, $v0-এ নয়।
  addiu $s0, $a0, 1      #গোপন নম্বর
  li $s1, 0              #প্রচেষ্টা

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Syscalls আর্গুমেন্ট/ফলাফল রেজিস্টার ওভাররাইট করতে পারে, তাই স্থায়ী অবস্থা $s রেজিস্টারে থাকে।
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #পূর্ণসংখ্যা ইনপুট $v0 এ ফেরত দেওয়া হয়।
  move $t0, $v0          #অনুমান
  addiu $s1, $s1, 1

  #যদি অনুমান < গোপন => খুব কম
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #যদি গোপন < অনুমান => খুব বেশি হয়
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #সমান => জয়
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
  #উভয় প্রতিক্রিয়া শাখা পরবর্তী পুনরাবৃত্তিতে একত্রিত হয়।
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
