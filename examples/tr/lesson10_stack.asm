# ==========================================================
#Ders 10 - Yığın bir yazmaç ve bir uzaklıktır
#
#THE PROBLEM
#32 adet kayıt bulunmaktadır ve bunlar her bir bilgisayar tarafından paylaşılmaktadır.
#kod. Bir değer, bu işte hayatta kalması gerektiğinde nereye gider?
#bu kayıtları yeniden kullanacak mı?
#
#WHAT THE HARDWARE DOES
#Hiç özel bir şey yok. $sp sıradan bir kayıttır
#belleğe işaret eder ve yığın ona doğru büyür
#daha düşük adresler tamamen konvansiyon gereğidir.
#
#THE SOLUTION
#Yer ayırmak, $sp değerinden bir çıkarma işlemidir ve onu serbest bırakır
#ilave. İt ve patlat sadece sw ve lw'dir.
#
#WATCH FOR
#Kasalar mağazalar arasında bilinçli olarak temizleniyor
#ve yükler, dolayısıyla yazdırılan değerler ancak
#hafızadan geri dön. $sp'in 8 adım geri hareketini izleyin.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Yığın aşağı doğru büyür, bu nedenle tahsis $sp değerinden çıkar.
        addi $sp, $sp, -8       #iki kelime ayır
        sw   $t0, 0($sp)        #itmek
        sw   $t1, 4($sp)

        li   $t0, 0             #kayıtları tıkamak
        li   $t1, 0

        lw   $t0, 0($sp)        #pop
        lw   $t1, 4($sp)
        #Arayanın orijinal $sp'i görmesi için her tahsis dengelenmelidir.
        addi $sp, $sp, 8        #serbest bırakmak

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
