#تست نقطه شناور برای ابزار نمایش نقطه شناور
#الگوهای IEEE-754 بیت را در $f12 می‌نویسد و آنها را به‌عنوان مقادیر شناور چاپ می‌کند.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #خام IEEE الگوهای 754 بیتی، نه اعداد اعشاری

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #الگوی 32 بیتی را به صورت یک عدد صحیح بخوانید
  mtc1 $t2, $f12   #همان بیت ها را به FPU منتقل کنید: هیچ تبدیلی اتفاق نمی افتد

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 چاپ می کند $f12 به صورت شناور خوانده می شود
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #کلمه بعدی: هر الگو چهار بایت را اشغال می کند
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
