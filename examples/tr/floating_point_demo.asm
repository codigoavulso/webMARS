#Kayan Nokta Gösterimi aracı için kayan nokta testi
#IEEE-754 bit desenlerini $f12 içine yazar ve bunları kayan değerler olarak yazdırır.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #ham IEEE 754 bit desenler, ondalık sayılar değil

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #32 bitlik modeli bir tamsayı olarak okuyun
  mtc1 $t2, $f12   #aynı bitleri FPU içine taşıyın: dönüşüm gerçekleşmez

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #sistem çağrısı 2, $f12 kayan nokta olarak okunarak yazdırır
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #sonraki kelime: her desen dört bayt kaplar
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
