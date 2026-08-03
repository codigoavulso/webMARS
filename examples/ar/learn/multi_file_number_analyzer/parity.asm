#مساعد مثال متعدد الملفات 1/2
#الإدخال: $a0 = الرقم
#الإخراج: $v0 = عنوان الرسالة "الزوجية" أو "الفردية"

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #البت الأقل أهمية هو 0 للأرقام الزوجية و1 للأرقام الفردية.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #قم بإرجاع عنوان بدلاً من الطباعة هنا؛ يختار المتصل كيفية استخدامه.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
