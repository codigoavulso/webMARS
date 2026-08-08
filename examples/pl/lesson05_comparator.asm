# ==========================================================
#Lekcja 05 - Komparator i gałąź
#
#THE PROBLEM
#Do podjęcia decyzji potrzebny jest jeden bit, ale porównanie dwóch liczb 32-bitowych
#jest odejmowaniem. W jaki sposób odejmowanie staje się wyborem?
#
#WHAT THE HARDWARE DOES
#slt odejmuje i odrzuca wszystko oprócz znaku,
#zapisanie 0 lub 1. Oddział następnie przekazuje ten bit do komputera PC
#logika, która albo dodaje przesunięcie, albo pozwala komputerowi na postęp.
#
#THE SOLUTION
#Porównaj z rejestrem, oddziałem na tym rejestrze. Kontrola
#przepływ jest arytmetyczny plus jeden multiplekser na komputerze.
#
#WATCH FOR
#Po slt, $t2 trzyma 1. Przejdź obok beq i obejrzyj komputer
#na pasku stanu: przeskakuje zamiast przesuwać się o cztery.
# ==========================================================
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
