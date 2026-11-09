# 08 - Bajty i kolejność bajtów
#
# W pamięci typu small-endian tego symulatora najmniej znaczący bajt słowa znajduje się pod
# najniższym adresem.
#
# Zapisz `0x04030201` jako słowo i odczytaj przesunięcia od 0 do 3 jako bajty. Dane wyjściowe to
# 1, 2, 3, 4.
#
# Spróbuj użyć młodszego bajtu `0xFF`. Obciążenie bez znaku z `lbu` daje 255, podczas gdy
# obciążenie ze znakiem z `lb` daje -1.

        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #bajt 01 jest najmniej znaczący
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #przesunięcie bajtu
bloop:
        #Pętla odwiedza przesunięcia 0, 1, 2 i 3 wewnątrz zapisanego słowa.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Adres efektywny = adres bazowy + bieżące przesunięcie bajtu.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #niepodpisany bajt
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
