# 11 - Bir fonksiyonun çağrılması
#
# Gecikmeli dallanma kapalı olarak çalıştırın. `jal` fonksiyona atlar ve bir sonraki talimatın
# adresini `$ra`'e koyar.
#
# Çağrı kuralı `$a0` ve `$a1`'de 17 ve 42'yi geçer. İşlev, `$v0`'deki daha büyük değeri
# döndürür.
#
# Aramaya başlayın, `$ra`'yi `jal`'den sonraki adresle karşılaştırın, ardından `jr $ra`'yi takip
# ederek arayana geri dönün.

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #ilk argüman
        li   $a1, 42            #ikinci argüman
        jal  maxof

        move $a0, $v0           #sonuç $v0'da geri geldi
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof bir yaprak işlevidir, dolayısıyla yığına $ra kaydetmeden geri dönebilir.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
