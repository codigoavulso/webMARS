#স্ট্রিং ইউটিলিটি ডেমো: strlen + strcpy (ম্যানুয়াল)
#উভয় রুটিন শূন্য টার্মিনেটর পর্যন্ত বাইট-বাই-বাইটে চলে।
#এগুলি পাতার ফাংশন, তাই তাদের স্ট্যাকে $ra সংরক্ষণ করার দরকার নেই।

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal রিটার্ন ঠিকানা $ra এ সঞ্চয় করে; আর্গুমেন্ট/ফলাফল o32 রেজিস্টার অনুসরণ করে।
  la   $a0, src
  jal  my_strlen
  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  la   $a0, dst
  la   $a1, src
  jal  my_strcpy

  li $v0, 4
  la $a0, msg1
  syscall

  li $v0, 4
  la $a0, dst
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#a0 = char*s; v0 = দৈর্ঘ্য
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #একটি পৃথক অক্ষর লোড করার সময় lbu সাইন এক্সটেনশন এড়িয়ে যায়।
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#a0 = dst, a1 = src
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #প্রথমে অনুলিপি করুন, তারপর পরীক্ষা করুন: এটি সমাপ্ত শূন্য বাইটকেও অনুলিপি করে।
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
