# ==========================================================
#Lekcja 15 – Dlaczego krok zmienia prędkość
#
#THE PROBLEM
#Dwie pętle poniżej odczytują tę samą tablicę i wykonują to samo
#liczba ładunków. Na prawdziwej maszynie działa się znacznie wolniej. The
#liczba instrukcji nie może tego wyjaśnić.
#
#WHAT THE HARDWARE DOES
#Pamięć nie dostarcza pojedynczych słów. Miss przynosi całość
#blok, zakładając, że wkrótce będą potrzebne sąsiednie słowa.
#Krok jednego zbiera ten zakład; krok szesnastu się opłaca
#dla bloku i czyta jedno słowo.
#
#THE SOLUTION
#Nic w kodzie się nie zmienia. Miejscowość jest własnością
#wzorzec dostępu i jest to wzorzec, który należy naprawić.
#
#WATCH FOR
#Otwórz Narzędzia > Symulator pamięci podręcznej danych, naciśnij Połącz z MIPS,
#potem biegnij. Porównaj współczynnik trafień w obu pętlach. Obie sumy
#wydrukuj 0, ponieważ tablica jest zerowana - liczba nie jest
#tutaj, współczynnik trafień wynosi.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
#---- każde słowo każdego bloku ----
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Indeksy sekwencyjne ponownie wykorzystują słowa z każdego bloku pamięci podręcznej przed przejściem dalej.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

#---- Jedno słowo w bloku, szesnaście słów od siebie ----
        li   $t1, 0
        li   $t3, 0
far:
        #Dodanie 16 pomija 64 bajty na iterację: zwykle jeden cały blok pamięci podręcznej.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
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
