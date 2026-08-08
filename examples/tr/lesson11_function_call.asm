# ==========================================================
#Ders 11 - Bir işlevi çağırmak
#
#THE PROBLEM
#Bir rutine atlamak kolaydır. Geri dönmek değil çünkü
#aynı rutin birçok yerden çağrılabilir ve
#İade adresi her zaman farklılık gösterir.
#
#WHAT THE HARDWARE DOES
#jal tek talimatta iki şey yapar:
#aşağıdaki komutun adresini $ra'da belirtin, ardından atlar. Jr.
#bir kaydın tuttuğu şeye atlar, böylece jr $ra geri döner.
#
#THE SOLUTION
#Geriye kalan her şey devre değil anlaşmadır: argümanlar
#$a0..$a3, $v0 ile sonuçlanır. Kuralları ve kuralları çiğneyin
#hala toplanıyor; yalnızca birlikte çalışmayı durduruyor.
#
#WATCH FOR
#Jalin üzerine çıkın ve $ra okuyun. Adresle karşılaştırın
#Metin Segmentindeki çağrıdan sonraki satırın.
# ==========================================================
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
        #jal, tek bir mimari işlemde hem kontrol akışını hem de $ra değiştirir.
        jal  maxof              #$ra = sonraki satırın adresi

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
