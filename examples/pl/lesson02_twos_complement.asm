# 02 – Dopełnienie do dwójki
#
# W 32-bitowym uzupełnieniu do dwójki odwrócenie bitów liczby 5 i dodanie 1 daje reprezentację
# -5.
#
# Program oblicza tę samą wartość na dwa sposoby: `sub` od zera, następnie `nor` i `addi`.
#
# Obie ścieżki wypisują -5. Sprawdź `0xFFFFFFFB` w rejestrach, aby zobaczyć, jak te same bity
# wyglądają w formacie szesnastkowym.

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #Odejmowanie od zera tworzy odwrotność dodatku bez bitu znaku minus.
        li   $t0, 5
        sub  $t1, $zero, $t0    #dodatek robi robotę
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #ani z $zero jest bitowe NOT; dodanie jednego kończy uzupełnienie dwóch.
        nor  $t2, $t0, $zero    #odwróć wszystkie bity
        addi $t2, $t2, 1        #dodaj jedno
        move $a0, $t2           #taką samą wartość jak powyżej
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
