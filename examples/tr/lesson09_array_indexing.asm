# 09 - Bir diziyi indeksleme
#
# Her dizi öğesi dört bayt kaplar. Bayt uzaklığını hesaplamak için dizini iki sola kaydırın.
#
# `sll`, `add`, `lw` sırasını izleyin: dizini ölçeklendirin, temel adresi ekleyin ve öğeyi
# yükleyin.
#
# Dizin 2'de `$t5` 8'dir ve `$t6` 30 değerini gösterir. Beş öğenin toplamı 150'ye eşittir.

        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #baz
        li   $t1, 0             #ben
        li   $t2, 5             #uzunluk
        li   $t3, 0             #akümülatör

sum:
        #Döngü değişmezi: $t3 arr[0]'dan arr[i-1'e kadar olanların toplamıdır.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #ben * 4 bayt
        add  $t6, $t0, $t5      #taban + ölçekli dizin
        #$t6 artık tam olarak bir öğeyi adlandırıyor; lw 32 bitlik değerini getirir.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
