#تست برابری دستی:
#با فعال کردن انشعاب تاخیری، سرریز در شکاف تاخیر اتفاق می افتد.
#رفتار مورد انتظار:
#- پیام استثنا: سرریز حسابی
#- مجموعه Cause.BD
#- EPC به دستورالعمل beq اشاره می کند

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
