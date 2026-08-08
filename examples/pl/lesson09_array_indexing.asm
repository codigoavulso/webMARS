# ==========================================================
#Lekcja 09 – Indeksowanie tablicy
#
#THE PROBLEM
#Instrukcja ładowania oferuje rejestr podstawowy i stałą
#przesunięcie. Nic więcej. Jak więc osiąga się a[i], skoro jest tylko i
#znane w czasie wykonywania, siedzące w rejestrze?
#
#WHAT THE HARDWARE DOES
#Dodaje bazę do wszystkiego, co zawiera rejestr. Indeks
#musi zatem być już w bajtach, a nie w elementach.
#
#THE SOLUTION
#Skaluj indeks według rozmiaru elementu, a następnie dodaj. Dla czterech bajtów
#słowami, że skalowanie to przesunięcie w lewo o dwa, co kosztuje
#nic.
#
#WATCH FOR
#Trzy linie sll, add, lw są tym, do czego kompiluje się a[i].
#Przejdź przez jedną iterację i przeczytaj $t5 i $t6.
# ==========================================================
        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #baza
        li   $t1, 0             #ja
        li   $t2, 5             #długość
        li   $t3, 0             #akumulator

sum:
        #Niezmiennik pętli: $t3 jest sumą arr[0] do arr[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #i * 4 bajty
        add  $t6, $t0, $t5      #podstawa + skalowany indeks
        #$t6 teraz nazywa dokładnie jeden element; lw pobiera jego 32-bitową wartość.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
