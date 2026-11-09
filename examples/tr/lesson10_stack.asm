# 10 - Yığın
#
# Geleneksel olarak yığın daha düşük adreslere doğru büyür. İki kelimeye yer ayırmak için
# `$sp`'dan 8 çıkarın.
#
# Program iki kaydı `sw` ile kaydeder, temizler, ardından `lw` ile değerlerini geri yükler.
#
# Rezervasyondan önce, iki mağaza sırasında ve çıkıştan sonra `$sp` izleyin. Nihai değeri
# başlangıç ​​değeriyle eşleşmelidir.

        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Yığın aşağı doğru büyür, bu nedenle tahsis $sp değerinden çıkar.
        addi $sp, $sp, -8       #iki kelime ayır
        sw   $t0, 0($sp)        #itmek
        sw   $t1, 4($sp)

        li   $t0, 0             #kayıtları tıkamak
        li   $t1, 0

        lw   $t0, 0($sp)        #pop
        lw   $t1, 4($sp)
        #Arayanın orijinal $sp'i görmesi için her tahsis dengelenmelidir.
        addi $sp, $sp, 8        #serbest bırakmak

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
