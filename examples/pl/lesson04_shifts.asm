# 04 - Przesunięcia i potęgi dwójki
#
# Jeśli wynik pasuje, przesunięcie w lewo o 3 mnoży się przez 8. Bity przesunięte poza krawędź
# są odrzucane.
#
# Po prawej stronie `srl` wypełnia zerami i `sra` kopiuje bit znaku. Dla -16 przesuniętego o 2,
# spodziewaj się odpowiednio 1073741820 i -4.
#
# Spróbuj -15 z `sra`. Wynikiem jest -4, ponieważ przesunięcie zaokrągla się w dół; podpisane
# rundy podziału w kierunku zera.

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
