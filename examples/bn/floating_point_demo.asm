#ফ্লোটিং পয়েন্ট রিপ্রেজেন্টেশন টুলের জন্য ফ্লোটিং পয়েন্ট পরীক্ষা
#IEEE-754 বিট প্যাটার্নগুলিকে $f12 এ লেখে এবং ফ্লোট মান হিসাবে প্রিন্ট করে।

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #কাঁচা IEEE 754 বিট প্যাটার্ন, দশমিক সংখ্যা নয়

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #একটি পূর্ণসংখ্যা হিসাবে 32-বিট প্যাটার্ন পড়ুন
  mtc1 $t2, $f12   #একই বিটগুলি FPU এ সরান: কোন রূপান্তর ঘটে না

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 প্রিন্ট $f12 একটি ফ্লোট হিসাবে পড়া
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #পরবর্তী শব্দ: প্রতিটি প্যাটার্ন চার বাইট দখল করে
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
