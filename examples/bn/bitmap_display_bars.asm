#বিটম্যাপ প্রদর্শন ডেমো
#টুল খুলুন > বিটম্যাপ প্রদর্শন
#প্রোগ্রামটি ইউনিট 1x1, ডিসপ্লে 64x64, বেস 0x10010000 সেট করে।
#পরিবর্তনশীল রং সহ একটি চলমান অনুভূমিক বার আঁকে।

.data
msg0: .asciiz "\n=== Bitmap Display demo ===\n"
msg1: .asciiz "Open Tools > Bitmap Display and connect to MIPS.\n"
msg2: .asciiz "Drawing animated color bars at 0x10010000...\n"

.text
main:
  li $t0, 0xffff0020      #webMARS বিটম্যাপ MMIO নিয়ন্ত্রণ ব্লক
  li $t1, 0x57424d50      #"WBMP"
  sw $t1, 0($t0)
  li $t1, 1
  sw $t1, 4($t0)         #প্রোটোকল সংস্করণ
  sw $t1, 8($t0)         #লক্ষ্য: বিটম্যাপ প্রদর্শন
  li $t1, 64
  sw $t1, 12($t0)        #প্রদর্শন প্রস্থ
  sw $t1, 16($t0)        #প্রদর্শন উচ্চতা
  li $t1, 1
  sw $t1, 20($t0)        #ইউনিট প্রস্থ
  sw $t1, 24($t0)        #ইউনিট উচ্চতা
  li $t1, 0x10010000
  sw $t1, 28($t0)        #ফ্রেমবাফার
  li $t1, 1
  sw $t1, 32($t0)        #পারমাণবিক প্রয়োগ

  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $s0, 0x1001         #ফ্রেম বাফার বেস = 0x10010000
  li  $s1, 64             #প্রস্থ
  li  $s2, 64             #উচ্চতা
  li  $s3, 0              #ফ্রেম সূচক

frame_loop:
  move $t0, $zero         #y = 0
row_loop:
  move $t1, $zero         #x = 0
col_loop:
  #addr = base + (y*64 + x) * 4)
  sll  $t2, $t0, 6        #y*64
  addu $t2, $t2, $t1      #y*64 + x
  sll  $t2, $t2, 2        # *4
  addu $t3, $s0, $t2

  #বিল্ড কালার 0x00RRGGBB
  #R = (x + ফ্রেম) & 255
  #G = (y*4) & 255
  #B = (x^y^frame) & 255
  addu $t4, $t1, $s3
  andi $t4, $t4, 0xff

  sll  $t5, $t0, 2
  andi $t5, $t5, 0xff

  xor  $t6, $t1, $t0
  xor  $t6, $t6, $s3
  andi $t6, $t6, 0xff

  sll  $t4, $t4, 16
  sll  $t5, $t5, 8
  or   $t7, $t4, $t5
  or   $t7, $t7, $t6

  sw   $t7, 0($t3)

  addiu $t1, $t1, 1
  blt   $t1, $s1, col_loop

  addiu $t0, $t0, 1
  blt   $t0, $s2, row_loop

  #ঘুম 30 ms
  li $v0, 32
  li $a0, 30
  syscall

  addiu $s3, $s3, 1
  j frame_loop
