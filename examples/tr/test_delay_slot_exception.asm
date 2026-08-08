#Manuel eşlik testi:
#Gecikmeli dallanma etkinleştirildiğinde gecikme yuvasında taşma meydana gelir.
#Beklenen davranış:
#- istisna mesajı: aritmetik taşma
#- Çünkü.BD seti
#- EPC beq komutunu işaret eder

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
