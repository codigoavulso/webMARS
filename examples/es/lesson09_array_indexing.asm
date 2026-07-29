# ==========================================================
# Clase 09 - Indexar un array
#
# EL PROBLEMA
#   Una instruccion de carga ofrece un registro base y un
#   desplazamiento constante. Nada mas. Como se llega a a[i]
#   cuando i solo se conoce en ejecucion, en un registro?
#
# LO QUE HACE EL HARDWARE
#   Suma la base a lo que contenga el registro. Por tanto el
#   indice debe venir ya en bytes, no en elementos.
#
# LA SOLUCION
#   Escalar el indice por el tamano del elemento y luego sumar.
#   Para palabras de cuatro bytes ese escalado es un
#   desplazamiento de dos a la izquierda, que no cuesta nada.
#
# OBSERVE
#   Las tres lineas sll, add, lw son en lo que se traduce a[i].
#   Recorra una iteracion y lea $t5 y $t6.
# ==========================================================
        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           # base
        li   $t1, 0             # i
        li   $t2, 5             # length
        li   $t3, 0             # accumulator

sum:
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        # i * 4 bytes
        add  $t6, $t0, $t5      # base + scaled index
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
