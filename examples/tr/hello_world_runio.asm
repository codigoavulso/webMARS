#Run I/O için Merhaba Dünya
#Basit bir mesaj yazdırır ve çıkar.
#Bu, veri/metin bölünmesinin ve sistem çağrısı kuralının en küçük örneğidir.

.data
#.asciiz, sistem çağrısı 4'ün gerektirdiği sıfır sonlandırıcının takip ettiği karakterleri saklar.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #$v0'da yazdırma dizesini (4) seçin ve dize adresini $a0'e iletin.
  li $v0, 4
  la $a0, msg
  syscall

  #Çıkış (10) simüle edilen programı temiz bir şekilde durdurur.
  li $v0, 10
  syscall
