#ملٹی فائل مثال مددگار 1/2
#ان پٹ: $a0 = نمبر
#آؤٹ پٹ: $v0 = "بھی" یا "طاق" پیغام کا پتہ

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #سب سے کم اہم بٹ جفت اعداد کے لیے 0 اور طاق اعداد کے لیے 1 ہے۔
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #یہاں پرنٹ کرنے کے بجائے ایڈریس واپس کریں؛ کال کرنے والا اسے استعمال کرنے کا طریقہ منتخب کرتا ہے۔
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
