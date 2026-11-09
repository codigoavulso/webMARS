# 11 - Wywołanie funkcji
#
# Uruchom z opóźnionym rozgałęzianiem. `jal` przeskakuje do funkcji i umieszcza adres następnej
# instrukcji w `$ra`.
#
# Konwencja wywoływania przechodzi 17 i 42 w `$a0` i `$a1`. Funkcja zwraca większą wartość z
# `$v0`.
#
# Rozpocznij rozmowę, porównaj `$ra` z adresem po `jal`, a następnie podążaj `jr $ra` z powrotem
# do osoby dzwoniącej.

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #pierwszy argument
        li   $a1, 42            #drugi argument
        jal  maxof

        move $a0, $v0           #wynik wrócił w $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof jest funkcją liścia, więc może powrócić bez zapisywania $ra na stosie.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
