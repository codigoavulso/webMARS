#اختبار التكافؤ اليدوي:
#مع تمكين التفرع المؤجل، يحدث التجاوز في فتحة التأخير.
#السلوك المتوقع:
#- رسالة الاستثناء: التجاوز الحسابي
#- مجموعة السبب.BD
#- يشير EPC إلى تعليمات beq

.text
main:
  lui $t1, 0x7fff
  ori $t1, $t1, 0xffff
  ori $t2, $zero, 1
  beq $zero, $zero, done
  add $t0, $t1, $t2

done:
  ori $v0, $zero, 10
  syscall
