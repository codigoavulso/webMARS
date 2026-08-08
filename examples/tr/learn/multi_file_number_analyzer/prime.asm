#Çoklu dosya örneği yardımcısı 2/2
#Giriş: $a0 = [1.100] cinsinden sayı
#Çıkış: $v0 = sayı asal ise 1, aksi takdirde 0

.text
.globl is_prime
is_prime:
  #Tanım gereği 2'nin altındaki değerler asal değildir.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #sqrt(n)'den büyük hiçbir bölenin test edilmesine gerek yoktur.
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div, bölümü LO'ya ve geri kalanını HI'ya yerleştirir.
  div $a0, $t1
  mfhi $t4
  beq $t4, $zero, prime_no
  nop

  addiu $t1, $t1, 1
  j prime_loop
  nop

prime_yes:
  li $v0, 1
  jr $ra
  nop

prime_no:
  move $v0, $zero
  jr $ra
  nop
