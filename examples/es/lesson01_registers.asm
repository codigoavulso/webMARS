# 01 - Registros e inmediatos
#
# El valor inmediato está codificado en la instrucción. Ensambla y comprueba en qué instrucción
# básica se convierte cada `li`.
#
# Ejecuta paso a paso las dos cargas y la suma. En Registros, observa `$t0 = 12`, `$t1 = 30` y
# `$t2 = 42`.
#
# Cambia 30 por `0x12345678` y vuelve a ensamblar. La constante mayor necesita más de una
# instrucción básica.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        # Las syscalls usan $v0 como selector y $a0 como primer argumento.
        la   $a0, lbl
        li   $v0, 4
        syscall

        # li es una pseudoinstrucción; Assemble muestra en qué instrucción real se convierte.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # La suma se guarda en un registro distinto.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
