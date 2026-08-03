#webMARS সিস্টেম ঘড়ি বাধা ডেমো
#টুল খুলুন > সিস্টেম ক্লক এবং টাইমার, এটিকে MIPS এর সাথে সংযুক্ত করুন, একত্রিত করুন এবং চালান।
#একটি নির্ধারক সিমুলেটেড টাইমার প্রতি 200 নির্দেশে প্রোগ্রামে বাধা দেয়।

.eqv CLOCK_CONTROL 0xffff0050   #ডিভাইস রেজিস্টারগুলি MMIO ব্লকে থাকে
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #সময়কাল নির্বাহিত নির্দেশাবলীতে পরিমাপ করা হয়, তাই রান ঠিক পুনরাবৃত্তি হয়
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #বিট 0 টাইমার শুরু করে, বিট 1 এটি বাধা বাড়াতে দেয়
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #মেইন কখনই হ্যান্ডলারকে কল করে না: CPU নিজে থেকে এটিতে লাফ দেয়
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #শেষ করার আগে টাইমার বন্ধ করুন
  li $v0, 4
  la $a0, message
  syscall
  li $v0, 1
  move $a0, $t2
  syscall
  li $v0, 11
  li $a0, 10
  syscall
  li $v0, 10
  syscall
.ktext 0x80000180
timer_handler:
  mfc0 $k0, $13
  andi $k0, $k0, 0x0400
  beq $k0, $zero, handler_done
  nop
  la $k1, ticks
  lw $k0, 0($k1)
  addiu $k0, $k0, 1
  sw $k0, 0($k1)
handler_done:
  eret
