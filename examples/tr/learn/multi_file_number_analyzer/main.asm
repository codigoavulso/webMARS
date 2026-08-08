#Çoklu dosya örneği: ana modül
#Bu dosyayı aktif tutun ve Birleştir'e basın.
#Aşağıdaki .include yönergeleri diğer iki dosyayı çeker.
#- parity.asm sayının çift mi yoksa tek mi olduğunu belirten bir mesaj döndürür
#- prime.asm, sayı asal olduğunda $v0'da 1 değerini döndürür
#
#Akış:
#1. Çıkmak için [1,100] veya 0'dan bir sayı isteyin
#2. Sayının çift mi yoksa tek mi olduğunu yazdırın
#3. Sayının asal olup olmadığını yazdırın
#4. Tekrarlayın

.data
#Bu modül kullanıcıya yönelik dizelere sahiptir; yardımcı modüller kendi özel verilerine/kodlarına sahiptir.
title:         .asciiz "\n=== Multi-file number analyzer ===\n"
hint:          .asciiz "This example uses 3 separate files assembled together.\n"
prompt:        .asciiz "Enter a number [1..100] (0 to exit): "
invalid_msg:   .asciiz "Please enter a value between 1 and 100.\n"
result_prefix: .asciiz "Number "
parity_prefix: .asciiz " is "
prime_yes_msg: .asciiz " and it is prime.\n"
prime_no_msg:  .asciiz " and it is not prime.\n"
goodbye_msg:   .asciiz "Bye!\n"

.text
.globl main
main:
  li $v0, 4
  la $a0, title
  syscall

  li $v0, 4
  la $a0, hint
  syscall

input_loop:
  #Sistem çağrısı 5, $v0 içine girilen tamsayıyı döndürür.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #İmzalı karşılaştırmalarla alt ve üst sınırları doğrulayın.
  slti $t0, $s0, 1
  bne $t0, $zero, invalid_input
  nop

  slti $t0, $s0, 101
  beq $t0, $zero, invalid_input
  nop

  li $v0, 4
  la $a0, result_prefix
  syscall

  li $v0, 1
  #o32 çağrı kuralı: $a0 içindeki argüman, $v0 içindeki sonuç işaretçisi.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #İkinci modül $v0 cinsinden bir boole değeri döndürür.
  move $a0, $s0
  jal get_parity_message
  nop

  move $s1, $v0
  li $v0, 4
  move $a0, $s1
  syscall

  move $a0, $s0
  jal is_prime
  nop

  bne $v0, $zero, print_prime_yes
  nop

  li $v0, 4
  la $a0, prime_no_msg
  syscall
  j input_loop
  nop

print_prime_yes:
  li $v0, 4
  la $a0, prime_yes_msg
  syscall
  j input_loop
  nop

invalid_input:
  li $v0, 4
  la $a0, invalid_msg
  syscall
  j input_loop
  nop

exit_program:
  li $v0, 4
  la $a0, goodbye_msg
  syscall

  li $v0, 10
  syscall

#İçerikler montaj sırasında proje dosyalarından çözümlenir.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
