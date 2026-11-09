# 12 - Rekurencja i ramki
#
# Wywołanie rekurencyjne zastępuje `$ra` i używa `$a0` jako własnego argumentu. Zapisz obie
# wartości przed wykonaniem połączenia.
#
# Wejdź do `fact` dla każdej wartości od 5 do 1. Każde wywołanie rezerwuje osiem bajtów,
# włączając wywołanie, które zwraca 1.
#
# Ustaw punkt przerwania na `mul`, aby obserwować ścieżkę powrotną. Każde wywołanie przeładowuje
# swój własny argument, mnoży i zwalnia swoją ramkę.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fakt(int n) ----
fact:
        #Każde wywołanie posiada odrębną ośmiobajtową ramkę.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #adres zwrotny tego połączenia
        sw   $a0, 4($sp)        #to połączenie jest nr

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #przypadek podstawowy: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #znowu nasze n
        mul  $v0, $v0, $a0

factend:
        # Przywróć zapisany adres zwrotny przed zwolnieniem ramki tego połączenia.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
