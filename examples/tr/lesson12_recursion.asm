# ==========================================================
#Ders 12 - Özyinelemenin çağrı başına bir kareye ihtiyacı vardır
#
#THE PROBLEM
#Özyinelemeli bir çağrı, $ra ve bağımsız değişken kaydının üzerine yazar.
#Bu durumda dış çağrının geri dönüşü yoktur ve ne olduğu hakkında hiçbir fikri yoktur.
#kendi n'si öyleydi.
#
#WHAT THE HARDWARE DOES
#Bir yığın değil, bir $ra sağlar. Hiçbir şey kaydedilmedi
#otomatik olarak; kod onu kaydetmezse kaybolur.
#
#THE SOLUTION
#Her aktivasyon yığında bir çerçeve açar ve onu saklar.
#aramadan sonra hala ihtiyaç duyacak ve yolda geri yükleyecektir
#dışarı. Yığın derinliği yineleme derinliğidir.
#
#WATCH FOR
#Mul'da bir kesme noktası belirleyin ve $sp'in başına 8 oranında azalmasını izleyin.
#seviye. N'nin kaydedilen beş kopyası,
#dönüş yolunda çarpma mümkün.
# ==========================================================
        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fact(int n) ----
fact:
        #Her çağrının ayrı bir sekiz baytlık çerçevesi vardır.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #bu aramanın dönüş adresi
        sw   $a0, 4($sp)        #bu aramanın numarası

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #temel durum: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #yine bizim n'miz
        mul  $v0, $v0, $a0

factend:
        #Aranan kişinin durumunu geri yükleyin ve girişte ayrılan çerçeveyi tam olarak atın.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
