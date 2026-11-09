# 04 - İkinin vardiyaları ve güçleri
#
# Sonuç uygun olduğunda 3 oranında sola kaydırma 8 ile çarpılır. Kenarı geçen parçalar atılır.
#
# Sağdaki `srl` sıfırlarla doldurur ve `sra` işaret bitini kopyalar. -16'nın 2 kaydırılması için
# sırasıyla 1073741820 ve -4 bekleniyor.
#
# `sra` ile -15'i deneyin. Sonuç -4'tür çünkü kaydırma aşağı yuvarlanır; İmzalı bölünme sıfıra
# doğru yuvarlanıyor.

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
