# ==========================================================
#Lektion 09 – Indizieren eines Arrays
#
#THE PROBLEM
#Eine Ladeanweisung bietet ein Basisregister und eine Konstante
#versetzt. Sonst nichts. Wie wird also ein[i] erreicht, wenn ich nur bin?
#zur Laufzeit bekannt, in einem Register sitzend?
#
#WHAT THE HARDWARE DOES
#Es fügt die Basis zu dem hinzu, was das Register enthält. Der Index
#muss daher bereits in Bytes vorliegen, nicht in Elementen.
#
#THE SOLUTION
#Skalieren Sie den Index um die Elementgröße und fügen Sie dann hinzu. Für vier Byte
#Mit anderen Worten, Skalierung ist eine Verschiebung um zwei nach links, was Kosten verursacht
#nichts.
#
#WATCH FOR
#Die drei Zeilen sll, add, lw sind das, wozu a[i] kompiliert wird.
#Gehen Sie eine Iteration durch und lesen Sie $t5 und $t6.
# ==========================================================
        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #Basis
        li   $t1, 0             #ich
        li   $t2, 5             #Länge
        li   $t3, 0             #Akkumulator

sum:
        #Schleifeninvariante: $t3 ist die Summe von arr[0] bis arr[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #i * 4 Bytes
        add  $t6, $t0, $t5      #Basis + skalierter Index
        #$t6 benennt jetzt genau ein Element; lw ruft seinen 32-Bit-Wert ab.
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
