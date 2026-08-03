#প্রোগ্রাম আর্গুমেন্ট উদাহরণ.
#MARS-এ argc/argv সমর্থন পরীক্ষা করতে এই উদাহরণটি ব্যবহার করুন।
#এটি চেষ্টা করার জন্য, MIPS প্রোগ্রামে দেওয়া সেটিংস > প্রোগ্রাম আর্গুমেন্টে যান,
#কিছু আর্গুমেন্ট লিখুন, তারপর অ্যাসেম্বল করুন এবং প্রোগ্রাম চালান।
#উদাহরণ আর্গুমেন্ট: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #প্রোগ্রাম আর্গুমেন্ট জন্য ডেমো প্রোগ্রাম.
  #প্রবেশের সময়:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #argc সংরক্ষণ করুন।
  move $s1, $a1          #Argv সংরক্ষণ করুন।

  #প্রিন্ট argc.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #argv[i] এর উপর লুপ।
  li   $t0, 0            #i = 0

print_loop:
  beq  $t0, $s0, done

  li   $v0, 4
  la   $a0, argv_msg
  syscall

  li   $v0, 1
  move $a0, $t0
  syscall

  li   $v0, 4
  la   $a0, mid_msg
  syscall

  #argv হল পয়েন্টারের একটি অ্যারে, তাই argv[i] হল argv + i * 4 এ।
  sll  $t1, $t0, 2       #অফসেট = i * 4
  addu $t2, $s1, $t1     #argv[i] এর ঠিকানা
  lw   $a0, 0($t2)       #লোড argv[i]

  li   $v0, 4
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  addiu $t0, $t0, 1
  j    print_loop

done:
  li   $v0, 10
  syscall
