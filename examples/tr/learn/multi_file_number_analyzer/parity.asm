#Çoklu dosya örneği yardımcısı 1/2
#Giriş: $a0 = sayı
#Çıkış: $v0 = "çift" veya "tek" mesajın adresi

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #En az anlamlı bit çift sayılar için 0, tek sayılar için 1'dir.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #Buraya yazdırmak yerine bir adres gönderin; arayan kişi bunun nasıl kullanılacağını seçer.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
