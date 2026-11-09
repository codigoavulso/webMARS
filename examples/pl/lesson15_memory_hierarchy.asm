# 15 - Dlaczego krok zmienia prędkość
#
# Obie pętle korzystają z tej samej tablicy. Pierwszy czyta wszystkie 256 słów; drugi czyta co
# 16 słowo, co daje tylko 16 ładunków.
#
# Dzięki blokom pamięci podręcznej składającym się z 16 słów, odczyty sekwencyjne mogą ponownie
# wykorzystać każdy pobrany blok. Druga pętla przechodzi do nowego bloku przy każdym obciążeniu.
#
# Podłącz symulator do MIPS, zaznacz „Włączone” i ustaw rozmiar bloku na 16 słów.
# Użyj Symulator pamięci podręcznej danych z punktem przerwania w `far`, aby sprawdzić pierwszą
# pętlę. Zresetuj tam statystyki pamięci podręcznej przed uruchomieniem drugiej pętli i porównaj
# współczynniki trafień.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Przejście sekwencyjne: wszystkie 256 słów.
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

# Przejście krokowe: jeden ładunek na szesnaście słów.
        li   $t1, 0
        li   $t3, 0
far:
        # Następny adres jest oddalony o 64 bajty: szesnaście słów po cztery bajty każde.
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
