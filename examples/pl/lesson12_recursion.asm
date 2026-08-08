# ==========================================================
#Lekcja 12 — Rekurencja potrzebuje ramki na wywołanie
#
#THE PROBLEM
#Wywołanie rekurencyjne nadpisuje $ra i rejestr argumentów.
#Zewnętrzne połączenie nie ma wówczas odwrotu i nie ma pojęcia, co to jest
#własne n było.
#
#WHAT THE HARDWARE DOES
#Zapewnia jeden $ra, a nie stos. Nic nie jest zapisane
#automatycznie; jeśli kod go nie zapisze, zniknął.
#
#THE SOLUTION
#Każda aktywacja otwiera ramkę na stosie, zachowując ją
#będzie nadal potrzebny po zakończeniu połączenia i przywraca go po drodze
#na zewnątrz. Głębokość stosu to głębokość rekurencji.
#
#WATCH FOR
#Ustaw punkt przerwania na mul i obserwuj, jak $sp spada o 8 na
#poziom. Pięć zapisanych kopii n sprawia, że
#możliwe jest mnożenie w drodze powrotnej.
# ==========================================================
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
        #Przywróć stan wywołany i odrzuć dokładnie tę ramkę przydzieloną przy wejściu.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
