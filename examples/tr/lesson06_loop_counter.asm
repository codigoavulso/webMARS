# ==========================================================
#Ders 06 - Yazılımda ve donanımda bir sayaç
#
#THE PROBLEM
#Donanım sayacı bir yazmaç, bir artırıcı ve bir
#karşılaştırıcı. Aynı makine yazılı olarak neye benziyor?
#talimat olarak mı?
#
#WHAT THE HARDWARE DOES
#Tam olarak bu üç bölüm, talimat başına bir tane: kayıt defteri
#sayımı tutar, addi artırıcıdır, dallı slt
#başka bir tura karar veren karşılaştırıcıdır.
#
#THE SOLUTION
#Döngü yeni bir kavram değildir. Sıralı mantık yazılır
#PC'yi saat olarak kullanarak dışarı çıkın.
#
#WATCH FOR
#$t0 sayım kaydıdır ve $t1 limittir. Adım adım ilerleyin
#bir tam tur ve hangi satırın hangi bölüm olduğunu belirtin.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #sayım kaydı
        li   $t1, 11            #sınır

loop:
        #Döngü değişmezi: $t0 yazdırılacak bir sonraki değerdir ve $t1'in altında kalır.
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
