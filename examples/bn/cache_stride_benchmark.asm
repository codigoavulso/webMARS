#ক্যাশে আচরণের বেঞ্চমার্ক: ক্রমিক বনাম স্ট্রাইড -16 অ্যাক্সেস।
#টুল খুলুন > ডেটা ক্যাশে সিমুলেশন টুল, এটিকে MIPS-এর সাথে সংযুক্ত করুন, এবং সক্রিয় চেক করুন।
#
#প্রতিটি এক্সিকিউশন ঠিক একটি কোল্ড-ক্যাশ প্যাটার্ন পরিমাপ করে। সেট করুন ACCESS_PATTERN
#1 বা 2 এ, সিমুলেটর পরিসংখ্যান রিসেট করুন, তারপর একত্রিত করুন এবং আবার চালান।
#উভয় নিদর্শন 1024 লোড সঞ্চালন; কোনো প্রারম্ভিকতা তথ্য দূষিত করে না।

.eqv ACCESS_PATTERN 1    #1 = অনুক্রমিক, 2 = স্ট্রাইড 16 শব্দ
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #প্যাটার্ন 1: অনুক্রমিক ঠিকানা।
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #প্যাটার্ন 2: প্রতি 16 তম শব্দে যান, তারপর শুরুর অফসেটটি অগ্রসর করুন।
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
