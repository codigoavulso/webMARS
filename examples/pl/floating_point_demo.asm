#Test zmiennoprzecinkowy dla narzędzia reprezentacji zmiennoprzecinkowej
#Zapisuje IEEE–754 wzorce bitowe w $f12 i drukuje je jako wartości zmiennoprzecinkowe.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #surowe IEEE 754-bitowe wzorce, a nie liczby dziesiętne

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #odczytaj wzór 32-bitowy jako liczbę całkowitą
  mtc1 $t2, $f12   #przenieś te same bity do FPU: nie następuje żadna konwersja

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 wypisuje $f12 odczytane jako wartość zmiennoprzecinkowa
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #następne słowo: każdy wzór zajmuje cztery bajty
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
