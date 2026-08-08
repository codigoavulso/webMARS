#دمو ابزارهای String: strlen + strcpy (دستی)
#هر دو روال بایت به بایت تا پایان‌دهنده صفر حرکت می‌کنند.
#آنها توابع برگ هستند، بنابراین نیازی به ذخیره $ra در پشته ندارند.

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal آدرس برگشتی را در $ra ذخیره می‌کند. آرگومان ها/نتایج از رجیسترهای o32 پیروی می کنند.
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

#a0 = char*s ; v0 = طول
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #lbu هنگام بارگیری یک کاراکتر جداگانه از گسترش علامت اجتناب می کند.
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#a0 = dst، a1 = src
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #ابتدا کپی کنید، سپس تست کنید: این بایت صفر پایانی را نیز کپی می کند.
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
