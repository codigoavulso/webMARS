#ব্যতিক্রম-হ্যান্ডলার ডেমো পুনরুদ্ধার করা হচ্ছে।
#আনলাইনড স্টোর ঠিকানা ত্রুটি (স্টোর) উত্থাপন করে। হ্যান্ডলার রেকর্ড করে
#কারণ, EPC এবং BadVAddr, ত্রুটিপূর্ণ নির্দেশনা এড়িয়ে যায় এবং ERET দিয়ে ফিরে আসে।

.data
recovered:     .asciiz "Recovered from the exception.\n"
cause_label:   .asciiz "Cause: "
epc_label:     .asciiz "EPC: "
badvaddr_label:.asciiz "BadVAddr: "
newline:       .asciiz "\n"
saved_cause:   .word 0
saved_epc:     .word 0
saved_badvaddr:.word 0

.text
main:
  li $t0, 0x12345678
  #ঠিকানা 1 শব্দ-সারিবদ্ধ নয়, তাই এই নির্দেশটি ইচ্ছাকৃতভাবে ত্রুটিযুক্ত।
  sw $t0, 1($zero)

  #হ্যান্ডলার একটি নির্দেশ দ্বারা EPC অগ্রসর হওয়ার পরে এখানে এক্সিকিউশন পুনরায় শুরু হয়।
  li $v0, 4
  la $a0, recovered
  syscall

  la $a0, cause_label
  syscall
  lw $a0, saved_cause
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, epc_label
  syscall
  lw $a0, saved_epc
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, badvaddr_label
  syscall
  lw $a0, saved_badvaddr
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

.ktext 0x80000180
exception_handler:
  #CP0 রেজিস্টার 13 = কারণ, 14 = EPC, 8 = BadVAddr।
  #কার্নেল রেজিস্টারগুলি $k0/$k1 বাধাপ্রাপ্ত ব্যবহারকারী রেজিস্টারগুলিকে নষ্ট করা এড়ায়।
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #পরিচিত ত্রুটিপূর্ণ 4-বাইট নির্দেশ এড়িয়ে যান; আবার চেষ্টা করলে তা চিরতরে ভুল হয়ে যাবে।
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
