#Contoh multi-file: modul utama
#Biarkan file ini tetap aktif dan tekan Assemble.
#Perintah .include di bawah menarik dua file lainnya.
#- parity.asm mengembalikan pesan yang memberitahukan apakah bilangan tersebut genap atau ganjil
#- prime.asm mengembalikan 1 di $v0 ketika bilangannya prima
#
#Aliran:
#1. Minta angka di [1,100], atau 0 untuk keluar
#2. Cetak apakah bilangan tersebut genap atau ganjil
#3. Cetak apakah bilangan tersebut prima
#4. Ulangi

.data
#Modul ini memiliki string yang dapat dilihat pengguna; modul pembantu memiliki data/kode pribadinya.
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
  #Syscall 5 mengembalikan bilangan bulat yang dimasukkan di $v0.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #Validasi batas bawah dan atas dengan perbandingan yang ditandatangani.
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
  #Konvensi panggilan o32: argumen di $a0, penunjuk hasil di $v0.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #Modul kedua mengembalikan boolean di $v0.
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

#Termasuk diselesaikan dari file proyek selama perakitan.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
