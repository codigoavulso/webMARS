# 05 - Komparator i gałąź
#
# `slt` porównuje dwie liczby całkowite ze znakiem i zapisuje 1, gdy pierwsza jest mniejsza, lub
# 0 w przeciwnym razie.
#
# Dla 7 i 12 `$t2` wynosi 1, więc `beq` nie przeskakuje do `notless` i wykonywanie jest
# kontynuowane do następnej instrukcji.
#
# Przy opóźnionym rozgałęzianiu przejdź obok `beq` i obserwuj komputer. Zamień dwie wartości
# wejściowe i porównaj nowe miejsce docelowe.

        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #a
        li   $t1, 12            #b
        #slt materializuje porównanie jako zwykłą liczbę całkowitą, nigdy jako ukryte flagi.
        slt  $t2, $t0, $t1      #t2 = 1 jeśli a < b
        #Rozgałęziaj się do notless tylko wtedy, gdy wynik logiczny wynosi zero.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
