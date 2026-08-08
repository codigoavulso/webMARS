# ==========================================================
#Ders 04 - Kaydırmalar veya tellerle çarpma
#
#THE PROBLEM
#Genel çarpan, piyasadaki en pahalı bloklardan biridir.
#bir veri yolu. 8 ile çarpmak bu kadar maliyetli olmamalı.
#
#WHAT THE HARDWARE DOES
#Kaydırma kesinlikle aritmetik değildir: okunan bitlerin aynısıdır
#farklı tellerden. n birim sola kaydırma 2^n ile çarpılır
#ve yalnızca yönlendirme maliyeti.
#
#THE SOLUTION
#İkinin kuvvetleri vardiya haline gelir. İki sağa kaymaya dikkat edin: srl
#en üstte sıfırları besler, sra işaret bitini kopyalar, bu nedenle yalnızca
#sra negatif bir sayıyı doğru şekilde böler.
#
#WATCH FOR
#-16 >> 2, sra ile -4 verir, ancak srl ile çok büyük bir pozitiftir.
#bitler aynı şekilde hareket ediyordu; yalnızca üstte girilenler farklıdır.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #Üç sola kaydırma, yalnızca 32 sonuç bitini korurken 2^3 ile çarpılır.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #Farklı gelen bitleri görmek için $t3 ve $t4'yi onaltılık sistemde karşılaştırın.
        sra  $t3, $t2, 2        #korunan işaret: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #sıfırlar kaydırıldı: büyük pozitif
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
