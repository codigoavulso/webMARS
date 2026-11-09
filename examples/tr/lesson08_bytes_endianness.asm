# 08 - Bayt ve bayt sırası
#
# Bu simülatörün küçük endian hafızasında, bir kelimenin en az anlamlı baytı en düşük adreste
# bulunur.
#
# `0x04030201`'yi bir kelime olarak saklayın ve 0'dan 3'e kadar olan uzaklıkları bayt olarak
# okuyun. Çıktı 1, 2, 3, 4'tür.
#
# `0xFF` düşük baytını deneyin. `lbu` olan işaretsiz yük 255 verirken, `lb` olan işaretsiz yük
# -1 verir.

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
