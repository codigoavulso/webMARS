# 06 - Pętla jako licznik
#
# `$t0` to następna liczba do wydrukowania. `$t1` to wyłączny górny limit, więc limit 11
# powoduje wydrukowanie liczb od 1 do 10.
#
# Porównanie jest uruchamiane przed każdą iteracją. Przyrost powoduje postęp w kierunku limitu,
# a skok powtarza kontrolę.
#
# Zmień limit na 1 i uruchom. Odgałęzienie wyjściowe jest pobierane przed pierwszym wydrukiem.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #rejestr licznikowy
        li   $t1, 11            #granica

loop:
        # W teście pętli kolejnym kandydatem jest $t0. Wydrukuj go tylko wtedy, gdy jest poniżej $t1.
        slt  $t2, $t0, $t1      #komparator
        beq  $t2, $zero, endl   #wyjdź, gdy liczba osiągnie limit

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #Aktualizacja licznika przed skokiem gwarantuje postęp w kierunku zakończenia.
        addi $t0, $t0, 1        #sumator
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
