# 03 - Bramki logiczne powyżej 32 bitów
#
# Każdy bit wyniku zależy tylko od odpowiednich bitów dwóch operandów. Nie ma przenoszenia
# pomiędzy pozycjami bitów.
#
# W przypadku maski `0x0F` AND zachowuje cztery najniższe bity i usuwa resztę. OR ustawia cztery
# najniższe bity, a XOR je odwraca.
#
# Porównaj trzy wyniki w formacie szesnastkowym, a następnie wypróbuj maskę `0xF0`, aby
# popracować nad następną grupą czterech bitów.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F maska

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND czyści każdą pozycję, w której maska zawiera zero.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR przełącza tylko pozycje wybrane przez jedynki w masce.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
