# 09 - Indexar un array
#
# Cada elemento del vector ocupa cuatro bytes. Desplaza el índice dos posiciones a la izquierda
# para calcular el desplazamiento en bytes.
#
# Sigue la secuencia `sll`, `add`, `lw`: ajusta la escala del índice, suma la dirección base y
# carga el elemento.
#
# Con índice 2, `$t5` vale 8 y `$t6` apunta al valor 30. La suma de los cinco elementos es 150.

        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           # dirección base
        li   $t1, 0             # i
        li   $t2, 5             # longitud
        li   $t3, 0             # acumulador

sum:
        # Invariante: $t3 contiene la suma desde arr[0] hasta arr[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        # i * 4 bytes
        add  $t6, $t0, $t5      # base + índice escalado
        # $t6 ya identifica un elemento exacto; lw carga su valor de 32 bits.
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
