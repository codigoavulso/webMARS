# ==========================================================
#Lekcja 06 - Licznik, programowy i sprzętowy
#
#THE PROBLEM
#Licznik sprzętowy to rejestr, inkrementator i a
#komparator. Jak wygląda ta sama maszyna napisana
#jako instrukcje?
#
#WHAT THE HARDWARE DOES
#Dokładnie te trzy części, po jednej na każdą instrukcję: rejestr
#przechowuje liczbę, addi jest inkrementatorem, slt z gałęzią
#jest komparatorem decydującym o kolejnej rundzie.
#
#THE SOLUTION
#Pętla nie jest nową koncepcją. Jest to logika sekwencyjna
#na zewnątrz, z komputerem PC jako zegarem.
#
#WATCH FOR
#$t0 to rejestr zliczający, a $t1 to limit. Przejdź przez
#jedną pełną rundę i podaj nazwę, która linia jest która częścią.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #rejestr licznikowy
        li   $t1, 11            #granica

loop:
        #Niezmiennik pętli: $t0 jest następną wartością do wydrukowania i pozostaje poniżej $t1.
        slt  $t2, $t0, $t1      #komparator
        beq  $t2, $zero, endl   #wyjdź, gdy liczba osiągnie limit

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #Aktualizacja licznika przed skokiem gwarantuje postęp w kierunku zakończenia.
        addi $t0, $t0, 1        #sumator
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
