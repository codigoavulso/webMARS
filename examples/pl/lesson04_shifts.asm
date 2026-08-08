# ==========================================================
#Lekcja 04 - Przesunięcia, czyli mnożenie za pomocą drutów
#
#THE PROBLEM
#Ogólny mnożnik jest jednym z najdroższych bloków
#ścieżka danych. Mnożenie przez 8 nie powinno kosztować tak dużo.
#
#WHAT THE HARDWARE DOES
#Przesunięcie nie jest wcale arytmetyczne: jest to odczytywanie tych samych bitów
#z różnych przewodów. Przesunięcie w lewo o n mnoży się przez 2^n
#i kosztuje tylko routing.
#
#THE SOLUTION
#Potęgi dwójki stają się przesunięciami. Zwróć uwagę na dwie przesunięcia w prawo: srl
#podaje zera na górze, sra kopiuje bit znaku, więc tylko
#sra poprawnie dzieli liczbę ujemną.
#
#WATCH FOR
#-16 >> 2 daje -4 w przypadku sra, ale ogromny plus w przypadku srl. The
#bity przesunięte identycznie; różni się tylko to, co wpisano na górze.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #Trzy przesunięcia w lewo mnożą się przez 2^3, zachowując tylko 32 bity wyniku.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #Porównaj $t3 i $t4 w formacie szesnastkowym, aby zobaczyć różne przychodzące bity.
        sra  $t3, $t2, 2        #zachowany znak: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #przesunięte zera: ogromny plus
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
