#معیار رفتار حافظه پنهان: دسترسی متوالی در مقابل گام 16.
#Tools > Data Cache Simulation Tool را باز کنید، آن را به MIPS متصل کنید و Enabled را علامت بزنید.
#
#هر اجرا دقیقاً یک الگوی حافظه پنهان را اندازه گیری می کند. تنظیم ACCESS_PATTERN
#به 1 یا 2، آمار شبیه ساز را بازنشانی کنید، سپس اسمبل کنید و دوباره اجرا کنید.
#هر دو الگو 1024 بار را انجام می دهند. هیچ نوشته اولیه داده ها را آلوده نمی کند.

.eqv ACCESS_PATTERN 1    #1 = ترتیبی، 2 = گام 16 کلمه
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

  #الگوی 1: آدرس های متوالی.
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

  #الگوی 2: از هر 16 کلمه بازدید کنید، سپس آفست شروع را پیش ببرید.
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
