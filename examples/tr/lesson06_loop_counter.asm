# 06 - Sayaç olarak döngü
#
# `$t0` yazdırılacak bir sonraki sayıdır. `$t1` özel üst sınırdır, yani 11 sınırı 1'den 10'a
# kadar yazdırır.
#
# Karşılaştırma her yinelemeden önce çalışır. Artış, sınıra doğru ilerleme sağlar ve atlama,
# kontrolü tekrarlar.
#
# Limiti 1 olarak değiştirin ve çalıştırın. Çıkış dalı ilk baskıdan önce alınır.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #sayım kaydı
        li   $t1, 11            #sınır

loop:
        # Döngü testinde $t0 bir sonraki adaydır. Yalnızca $t1'nin altındaysa yazdırın.
        slt  $t2, $t0, $t1      #karşılaştırıcı
        beq  $t2, $zero, endl   #sayım sınıra ulaştığında çık

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #Atlamadan önce sayacın güncellenmesi, sonlandırmaya doğru ilerlemeyi garanti eder.
        addi $t0, $t0, 1        #toplayıcı
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
