#COP1 গাণিতিক ডেমো।
#ডবল লোড/স্টোর, পাটিগণিত, তুলনা, শাখা এবং কভার করে
#সক্রিয় FCSR রাউন্ডিং মোড ব্যবহার করে একটি 32-বিট পূর্ণসংখ্যাতে রূপান্তর।

.data
.align 3   #দ্বিগুণ আট-বাইট প্রান্তিককরণ প্রয়োজন
left:          .double 1.5
right:         .double 2.25
stored_sum:    .space 8
round_source:  .float 1.6
sum_label:     .asciiz "1.5 + 2.25 = "
compare_true:  .asciiz "1.5 is less than 2.25\n"
compare_false: .asciiz "Unexpected comparison result\n"
round_label:   .asciiz "1.6 rounded with the default FCSR mode = "
newline:       .asciiz "\n"

.text
main:
  ldc1  $f0, left   #একটি ডবল একটি জোড় রেজিস্টার জোড়া দখল করে
  ldc1  $f2, right
  add.d $f4, $f0, $f2   #পাটিগণিত কপ্রসেসরে চলে, CPU এ নয়
  sdc1  $f4, stored_sum

  li    $v0, 4
  la    $a0, sum_label
  syscall
  mov.d $f12, $f4
  li    $v0, 3
  syscall
  li    $v0, 4
  la    $a0, newline
  syscall

  c.lt.d $f0, $f2   #তুলনা একটি পতাকা লেখে, এটি শাখা না
  bc1t   comparison_ok   #এই শাখা যে পতাকা পড়া
  nop
  la     $a0, compare_false
  b      print_comparison
  nop
comparison_ok:
  la     $a0, compare_true
print_comparison:
  li     $v0, 4
  syscall

  lwc1    $f6, round_source
  cvt.w.s $f8, $f6   #FCSR রাউন্ডিং মোড ব্যবহার করে 1.6 একটি পূর্ণসংখ্যা হয়
  mfc1    $a0, $f8   #প্রিন্ট করার জন্য ফলাফলটি CPU এ ফিরিয়ে আনুন
  li      $v0, 4
  la      $a0, round_label
  syscall
  mfc1    $a0, $f8
  li      $v0, 1
  syscall
  li      $v0, 4
  la      $a0, newline
  syscall

  li $v0, 10
  syscall
