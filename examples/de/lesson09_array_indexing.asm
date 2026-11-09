# 09 – Indizierung eines Arrays
#
# Jedes Array-Element belegt vier Bytes. Verschieben Sie den Index um zwei nach links, um seinen
# Byte-Offset zu berechnen.
#
# Befolgen Sie die Reihenfolge `sll`, `add`, `lw`: Skalieren Sie den Index, fügen Sie die
# Basisadresse hinzu und laden Sie das Element.
#
# Bei Index 2 ist `$t5` 8 und `$t6` zeigt auf den Wert 30. Die fünf Elemente ergeben zusammen
# 150.

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
