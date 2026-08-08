#عدد را حدس بزنید (1..100)
#از syscall 42 برای تولید اعداد تصادفی و syscall 5 برای ورودی اعداد صحیح استفاده می کند.
#$s0 راز را در سراسر syscals حفظ می‌کند. $s1 تلاش‌ها را در تکرارهای حلقه شمارش می‌کند.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #شناسه جریان تصادفی دانه = 1 با یک دانه دلخواه.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #عدد صحیح تصادفی در محدوده [0100)، سپس به [1100] تغییر مکان دهید.
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 مقدار تولید شده را در $a0 برمی‌گرداند، نه در $v0.
  addiu $s0, $a0, 1      #شماره مخفی
  li $s1, 0              #تلاش می کند

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Syscalls ممکن است رجیسترهای آرگومان/نتیجه را بازنویسی کنند، بنابراین حالت پایدار در رجیسترهای $s باقی می‌ماند.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #ورودی عدد صحیح در $v0 برگردانده می‌شود.
  move $t0, $v0          #حدس بزن
  addiu $s1, $s1, 1

  #اگر حدس بزنید < Secret => خیلی کم است
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #اگر مخفی < حدس => خیلی زیاد است
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #برابر => برد
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #هر دو شاخه بازخورد در تکرار بعدی همگرا می شوند.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
