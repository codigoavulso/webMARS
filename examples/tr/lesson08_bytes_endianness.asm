# ==========================================================
#Ders 08 - Bir kelimenin içindeki baytlar ve bayt sırası
#
#THE PROBLEM
#Bir kelime dört adresi kaplar. Hangi bayt en düşük değeri verir
#bu adreslerin adı?
#
#WHAT THE HARDWARE DOES
#Bu seçim bayt sırasıdır ve verilen bir kablolama kararıdır
#tüm makine için bir kez. MIPS işte küçük-endian:
#en az anlamlı bayt en düşük adreste yaşar.
#
#THE SOLUTION
#Bir kelimeyi saklayın, ardından her seferinde bir bayt geri okuyun ve
#Sipariş sizin için soruyu cevaplıyor.
#
#WATCH FOR
#0x04030201 1 2 3 4 olarak geri döner. En son yazılan bayt
#ilk önce metin okunur. lb yerine lbu kullanılır, dolayısıyla a
#127'nin üzerindeki bayt işaret genişletmeli değildir.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #bayt 01 en az anlamlıdır
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #bayt ofseti
bloop:
        #Döngü, saklanan kelimenin içindeki 0, 1, 2 ve 3 uzaklıklarını ziyaret eder.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Etkin adres = temel adres + geçerli bayt ofseti.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #imzasız bayt
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
