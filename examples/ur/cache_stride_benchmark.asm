#کیشے کے رویے کا بینچ مارک: ترتیب وار بمقابلہ اسٹرائیڈ -16 رسائی۔
#ٹولز > ڈیٹا کیش سمولیشن ٹول کھولیں، اسے MIPS سے جوڑیں، اور فعال چیک کریں۔
#
#ہر عملدرآمد بالکل ایک کولڈ کیش پیٹرن کی پیمائش کرتا ہے۔ سیٹ کریں ACCESS_PATTERN
#1 یا 2 پر، سمیلیٹر کے اعداد و شمار کو دوبارہ ترتیب دیں، پھر جمع کریں اور دوبارہ چلائیں۔
#دونوں پیٹرن 1024 بوجھ انجام دیتے ہیں۔ کوئی ابتداء ڈیٹا کو آلودہ نہیں کرتی ہے۔

.eqv ACCESS_PATTERN 1    #1 = ترتیب وار، 2 = سٹرائیڈ 16 الفاظ
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

  #پیٹرن 1: ترتیب وار پتے۔
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

  #پیٹرن 2: ہر 16 ویں لفظ پر جائیں، پھر ابتدائی آفسیٹ کو آگے بڑھائیں۔
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
