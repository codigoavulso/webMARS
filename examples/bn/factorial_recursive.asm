#রিকার্সিভ ফ্যাক্টরিয়াল (অনুষদ ক্লাসিক)
#n পড়ে এবং n প্রিন্ট করে! (ছোট n জন্য).

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n আছে $a0; ফলাফল $v0 এ ফিরে আসে
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#int fact(int n)
fact:
  addiu $sp, $sp, -8   #কল প্রতি এক ফ্রেম: দুটি শব্দ
  sw    $ra, 4($sp)   #আবার কল করার আগে ফিরতি ঠিকানা সংরক্ষণ করুন
  sw    $a0, 0($sp)   #Keep n: পুনরাবৃত্ত কলটি ওভাররাইট করে $a0

  blez  $a0, fact_base   #স্টপিং কন্ডিশন: এটি ছাড়া স্ট্যাক কখনই খোলা হয় না
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #আমাদের নিজস্ব n আবার, নীচের কল দ্বারা অস্পর্শ
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #ফিরে আসার আগে ফ্রেমটি পুনরুদ্ধার করুন এবং ছেড়ে দিন
  addiu $sp, $sp, 8
  jr    $ra
