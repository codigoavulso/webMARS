#بلبلا ترتیب کا ڈیمو
#ایک مقررہ صف کو ترتیب دیتا ہے اور ترتیب شدہ قدروں کو پرنٹ کرتا ہے۔
#تصورات: اشاریہ شدہ لفظ تک رسائی، نیسٹڈ لوپس، دستخط شدہ موازنہ اور جگہ جگہ تبادلہ۔
#رجسٹر پلان: $s0 = ارے کی بنیاد، $s1 = لمبائی، $t0/$t1 = لوپ انڈیکس۔

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #i
outer:
  #پاس i کے بعد، i سب سے بڑی قدریں پہلے ہی دائیں کنارے پر طے شدہ ہیں۔
  bge $t0, $s1, print
  li  $t1, 0              #جے
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #ایک لفظ چار بائٹس پر قبضہ کرتا ہے، لہذا arr[j] بیس + j*4 پر ہے۔
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #ملحقہ اقدار ترتیب سے باہر ہیں: انہیں میموری میں تبدیل کریں۔
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4 عنصر بہ عنصر ٹراورسل سے پہلے لیبل پرنٹ کرتا ہے۔
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #arr[index] لانے کے لیے اسی ایڈریس کیلکولیشن کو دوبارہ استعمال کریں۔
  bge $t7, $s1, end
  sll $t3, $t7, 2
  addu $t4, $s0, $t3
  lw  $a0, 0($t4)
  li  $v0, 1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addiu $t7, $t7, 1
  j print_loop

end:
  li $v0, 11
  li $a0, '\n'
  syscall
  li $v0, 10
  syscall
