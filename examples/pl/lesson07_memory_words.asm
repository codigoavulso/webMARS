# 07 - Słowa w pamięci
#
# Adresy pamięci liczą bajty. Każde słowo zajmuje cztery bajty, więc `lw` i `sw` używają tutaj
# przesunięć 0, 4 i 8.
#
# Adres słowa musi być wielokrotnością czterech. Użycie przesunięcia 1 zamiast 4 powoduje
# wyjątek wyrównania w tym programie.
#
# Po sklepach spójrz na `cell` w segmencie danych. Trzy sąsiadujące słowa powinny zawierać
# liczby 111, 222 i 333.

        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #adres bazowy

        #Każde przesunięcie poniżej jest względem $t0 i pozostaje wyrównane do słów.
        li   $t1, 111
        sw   $t1, 0($t0)        #pierwsze słowo
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 bajty = następne słowo
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 bajtów

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw rekonstruuje te same 32-bitowe wartości zapisane wcześniej przez sw.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
