#Kabarcık sıralama demosu
#Sabit bir diziyi sıralar ve sıralanmış değerleri yazdırır.
#Kavramlar: indekslenmiş kelime erişimi, iç içe döngüler, imzalı karşılaştırma ve yerinde takas.
#Kayıt planı: $s0 = dizi tabanı, $s1 = uzunluk, $t0/$t1 = döngü indeksleri.

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #ben
outer:
  #i'yi geçtikten sonra, i'nin en büyük değerleri zaten sağ kenarda sabitlenmiştir.
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #Bir kelime dört bayt kaplar, dolayısıyla arr[j] + j*4 tabanındadır.
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #Bitişik değerler bozuk: bunları bellekte değiştirin.
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Sistem çağrısı 4, etiketi öğe bazında geçişten önce yazdırır.
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #dizi[dizin]'i getirmek için aynı adres hesaplamasını yeniden kullanın.
  bge $t7, $s1, end
  sll $t3, $t7, 2
  addu $t4, $s0, $t3
  lw  $a0, 0($t4)
  li  $v0, 1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addiu $t7, $t7, 1
  j print_loop

end:
  li $v0, 11
  li $a0, '\n'
  syscall
  li $v0, 10
  syscall
