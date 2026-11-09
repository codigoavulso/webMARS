# 14 - 32 bitlik gerçek sayılar
#
# Tek duyarlıklı bir kayan nokta bir işaret bitine, sekiz üs bitine ve 23 kesir bitine sahiptir.
#
# `lwc1` bit modelini kayan nokta kaydına kopyalar. Daha sonra `add.s` 3,5 ve 1,25'i toplayarak
# 4,75'i oluşturur.
#
# Kayan Nokta Gösterimi aracındaki 4,75 ve 0,1 kodlamalarını karşılaştırın. 4,75 kesindir;
# 0,1'in yuvarlanması gerekiyor.

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #FPU kayıt dosyasına
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #FPU toplayıcı

        #Sistem çağrısı 2, kayan değişken bağımsız değişkenini özellikle $f12 içinde bekler.
        mov.s $f12, $f4
        li   $v0, 2             #kayan noktayı yazdır
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
