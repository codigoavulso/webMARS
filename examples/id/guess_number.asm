#Tebak Angka (1..100)
#Menggunakan syscall 42 untuk pembuatan nomor acak dan syscall 5 untuk input bilangan bulat.
#$s0 menjaga rahasia di seluruh syscall; $s1 menghitung upaya di seluruh iterasi loop.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #Benih aliran acak id=1 dengan benih arbitrer.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #Bilangan bulat acak dalam rentang [0,100), lalu geser ke [1,100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 mengembalikan nilai yang dihasilkan di $a0, bukan di $v0.
  addiu $s0, $a0, 1      #nomor rahasia
  li $s1, 0              #upaya

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Syscall dapat menimpa register argumen/hasil, sehingga status persisten tetap berada di register $s.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #Input bilangan bulat dikembalikan dalam $v0.
  move $t0, $v0          #tebak
  addiu $s1, $s1, 1

  #jika tebakan < rahasia => terlalu rendah
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #jika rahasia < tebakan => terlalu tinggi
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #sama => menang
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
  #Kedua cabang umpan balik bertemu pada iterasi berikutnya.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
