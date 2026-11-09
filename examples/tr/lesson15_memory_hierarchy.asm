# 15 - Adım hızı neden değiştirir?
#
# Her iki döngü de aynı diziyi kullanır. İlki 256 kelimenin tamamını okur; ikincisi her 16.
# kelimeyi okur ve yalnızca 16 yükleme yapar.
#
# 16 kelimelik önbellek bloklarıyla sıralı okumalar, getirilen her bloğu yeniden kullanabilir.
# İkinci döngü her yükte yeni bir bloğa ilerler.
#
# Simülatörü MIPS'e bağlayın, «Etkin» kutusunu işaretleyin ve blok boyutunu 16 sözcük yapın.
# İlk döngüyü incelemek için Veri Önbelleği Simülatörü'yi `far`'de bir kesme noktasıyla
# kullanın. İkinci döngüyü çalıştırmadan önce önbellek istatistiklerini sıfırlayın ve isabet
# oranlarını karşılaştırın.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Sıralı geçiş: 256 kelimenin tamamı.
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Sıralı dizinler, devam etmeden önce her önbellek bloğundaki sözcükleri yeniden kullanır.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# Adımlı geçiş: her on altı kelimede bir yükleme.
        li   $t1, 0
        li   $t3, 0
far:
        # Bir sonraki adres 64 bayt uzakta: her biri dört baytlık on altı kelime.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
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
