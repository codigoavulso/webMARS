#Yükte adres hatası için manuel eşlik testi.
#Beklenen davranış:
#- 0x10010001 üzerinde yük istisnası oluşturuldu
#- hatalı adres / vaddr 0x10010001 gösteriyor

.data
value: .word 0x12345678

.text
main:
  lui $t0, 0x1001
  ori $t0, $t0, 0x0001
  lw $t1, 0($t0)
  ori $v0, $zero, 10
  syscall
