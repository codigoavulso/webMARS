# 09 – Indeksowanie tablicy
#
# Każdy element tablicy zajmuje cztery bajty. Przesuń indeks w lewo o dwa, aby obliczyć jego
# przesunięcie bajtowe.
#
# Postępuj zgodnie z sekwencją `sll`, `add`, `lw`: przeskaluj indeks, dodaj adres bazowy i
# załaduj element.
#
# Przy indeksie 2 `$t5` wynosi 8, a `$t6` wskazuje na wartość 30. Pięć elementów daje w sumie
# 150.

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
