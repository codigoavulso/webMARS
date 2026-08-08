#Sayıyı Tahmin Et (1..100)
#Rastgele sayı üretimi için sistem çağrısı 42'yi ve tamsayı girişi için sistem çağrısı 5'i kullanır.
#$s0 sırrı sistem çağrılarında saklıyor; $s1 döngü yinelemelerindeki girişimleri sayar.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #Rastgele bir tohumla tohum rastgele akış kimliği=1.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #[0,100] aralığında rastgele tamsayı, ardından [1,100]'e kaydırın.
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  # Sistem çağrısı 42, oluşturulan değeri döndürür $a0, içinde değil $v0.
  addiu $s0, $a0, 1      #gizli numara
  li $s1, 0              #girişimler

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Sistem çağrıları argüman/sonuç kayıtlarının üzerine yazabilir, böylece kalıcı durum $s kayıtlarında kalır.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #Tamsayı girişi $v0 cinsinden döndürülür.
  move $t0, $v0          #tahmin etmek
  addiu $s1, $s1, 1

  #eğer tahmin edersen < gizli => çok düşük
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #if secret < tahmin => çok yüksek
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #eşit => kazan
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #Her iki geri bildirim dalı bir sonraki yinelemede birleşir.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
