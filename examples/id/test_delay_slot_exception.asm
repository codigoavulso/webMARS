#Tes paritas manual:
#Dengan mengaktifkan percabangan tertunda, luapan terjadi di slot penundaan.
#Perilaku yang diharapkan:
#- pesan pengecualian: luapan aritmatika
#- Penyebab.BD ditetapkan
#- EPC menunjuk ke instruksi beq

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
