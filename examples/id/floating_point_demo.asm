#Uji titik mengambang untuk alat Representasi Titik Mengambang
#Menulis pola bit IEEE-754 ke dalam $f12 dan mencetaknya sebagai nilai float.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #mentah IEEE pola 754 bit, bukan angka desimal

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #membaca pola 32-bit sebagai bilangan bulat
  mtc1 $t2, $f12   #pindahkan bit yang sama ke dalam FPU: tidak ada konversi yang terjadi

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 mencetak $f12 dibaca sebagai float
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #kata berikutnya: setiap pola menempati empat byte
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
