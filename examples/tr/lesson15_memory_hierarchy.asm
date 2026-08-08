# ==========================================================
#Ders 15 - Adımlar hızı neden değiştirir?
#
#THE PROBLEM
#Aşağıdaki iki döngü aynı diziyi okur ve aynı işlemi gerçekleştirir
#yük sayısı. Gerçek bir makinede çok daha yavaştır.
#talimat sayısı bunu açıklayamaz.
#
#WHAT THE HARDWARE DOES
#Bellek tek sözcükleri iletmez. Bir özlem bir bütün getirir
#blok, komşu kelimelerin yakında isteneceğine dair iddiaya giriyor.
#Bir adımlık bir adım o bahsi toplar; on altılık bir adım öder
#bir blok için ve bunun bir kelimesini okur.
#
#THE SOLUTION
#Kodda hiçbir şey değişmiyor. Yerellik mülkünün bir özelliğidir
#erişim düzeni ve düzeltilmesi gereken kalıp budur.
#
#WATCH FOR
#Araçlar > Veri Önbelleği Simülatörü'nü açın, MIPS'a bağlan'a basın,
#sonra koş. İki döngünün isabet oranını karşılaştırın. Her iki toplam
#dizi sıfırlandığı için 0 yazdır - sayı
#Burada nokta, isabet oranıdır.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
#---- her bloğun her kelimesi ----
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

#---- blok başına bir kelime, on altı kelime arayla ----
        li   $t1, 0
        li   $t3, 0
far:
        #16 eklemek yineleme başına 64 baytı atlar: genellikle tam bir önbellek bloğu.
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
