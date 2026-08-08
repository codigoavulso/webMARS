#کمک کننده مثال چند فایلی 1/2
#ورودی: $a0 = عدد
#خروجی: $v0 = آدرس پیغام "زوج" یا "فرد"

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #بیت کم اهمیت 0 برای اعداد زوج و 1 برای اعداد فرد است.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #یک آدرس را به جای چاپ در اینجا برگردانید. تماس گیرنده نحوه استفاده از آن را انتخاب می کند.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
