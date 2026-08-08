# ==========================================================
#Lekcja 07 – Słowa w pamięci i dlaczego adresy przeskakują o cztery
#
#THE PROBLEM
#Pamięć jest adresowana bajt po bajcie, ale rejestr się utrzymuje
#cztery bajty. Co właściwie wybiera pojedynczy adres?
#
#WHAT THE HARDWARE DOES
#lw i sw przenoszą cztery bajty w jednym dostępie, a więc po kolei
#słowa są oddalone od siebie o cztery adresy. Dwa niskie bity
#adres musi wynosić zero: to wyrównanie pozwala
#sprzęt pobiera całe słowo w jednym cyklu.
#
#THE SOLUTION
#Arytmetyka adresów odbywa się w bajtach, a więc indeks w słowach
#jest zawsze skalowana przez cztery.
#
#WATCH FOR
#Złóż, a następnie otwórz segment danych w 0x10010000. The
#trzy wartości pojawiają się w sąsiednich kolumnach jednego wiersza.
# ==========================================================
        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #adres bazowy

        #Każde przesunięcie poniżej jest względem $t0 i pozostaje wyrównane do słów.
        li   $t1, 111
        sw   $t1, 0($t0)        #pierwsze słowo
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 bajty = następne słowo
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 bajtów

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw rekonstruuje te same 32-bitowe wartości zapisane wcześniej przez sw.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
