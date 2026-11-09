# 10 - Stos
#
# Zgodnie z konwencją stos rośnie w kierunku niższych adresów. Odejmij 8 od `$sp`, aby
# zarezerwować miejsce na dwa słowa.
#
# Program zapisuje dwa rejestry z `sw`, czyści je, a następnie przywraca ich wartości z `lw`.
#
# Oglądaj `$sp` przed rezerwacją, w trakcie dwóch sklepów i po premierze. Jego wartość końcowa
# powinna odpowiadać wartości początkowej.

        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Stos rośnie w dół, więc alokacja odejmuje się od $sp.
        addi $sp, $sp, -8       #zarezerwuj dwa słowa
        sw   $t0, 0($sp)        #pchnij
        sw   $t1, 4($sp)

        li   $t0, 0             #zaśmiecać rejestry
        li   $t1, 0

        lw   $t0, 0($sp)        #pop
        lw   $t1, 4($sp)
        #Każda alokacja musi być zbilansowana, aby osoba wywołująca widziała swoją oryginalną $sp.
        addi $sp, $sp, 8        #zwolnić

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
