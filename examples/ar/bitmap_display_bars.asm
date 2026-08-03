#العرض التوضيحي للصور النقطية
#افتح الأدوات > عرض الصورة النقطية
#يقوم البرنامج بتعيين الوحدة 1x1، العرض 64x64، القاعدة 0x10010000.
#رسم شريط أفقي متحرك بألوان متغيرة.

.data
msg0: .asciiz "\n=== Bitmap Display demo ===\n"
msg1: .asciiz "Open Tools > Bitmap Display and connect to MIPS.\n"
msg2: .asciiz "Drawing animated color bars at 0x10010000...\n"

.text
main:
  li $t0, 0xffff0020      #webMARS كتلة التحكم النقطية MMIO
  li $t1, 0x57424d50      #"WBMP"
  sw $t1, 0($t0)
  li $t1, 1
  sw $t1, 4($t0)         #نسخة البروتوكول
  sw $t1, 8($t0)         #الهدف: عرض الصورة النقطية
  li $t1, 64
  sw $t1, 12($t0)        #عرض العرض
  sw $t1, 16($t0)        #ارتفاع العرض
  li $t1, 1
  sw $t1, 20($t0)        #عرض الوحدة
  sw $t1, 24($t0)        #ارتفاع الوحدة
  li $t1, 0x10010000
  sw $t1, 28($t0)        #com.framebuffer
  li $t1, 1
  sw $t1, 32($t0)        #تطبيق الذرية

  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $s0, 0x1001         #قاعدة المخزن المؤقت للإطار = 0x10010000
  li  $s1, 64             #العرض
  li  $s2, 64             #الارتفاع
  li  $s3, 0              #مؤشر الإطار

frame_loop:
  move $t0, $zero         #ص = 0
row_loop:
  move $t1, $zero         #س = 0
col_loop:
  #العنوان = القاعدة + ((ص*64 + س) * 4)
  sll  $t2, $t0, 6        #ص*64
  addu $t2, $t2, $t1      #ص*64 + س
  sll  $t2, $t2, 2        # *4
  addu $t3, $s0, $t2

  #بناء اللون 0x00RRGBB
  #ص = (س + إطار) & 255
  #ز = (ص*4) & 255
  #ب = (س ^ ص ^ الإطار) & 255
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

  #النوم 30 مللي ثانية
  li $v0, 32
  li $a0, 30
  syscall

  addiu $s3, $s3, 1
  j frame_loop
