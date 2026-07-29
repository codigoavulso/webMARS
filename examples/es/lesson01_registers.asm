# ==========================================================
# Clase 01 - Registros y valores inmediatos
#
# EL PROBLEMA
#   La ALU tiene dos puertos de entrada y ambos estan conectados
#   al banco de registros. Un numero escrito en el codigo no esta
#   en un registro, por lo que no llega a esos puertos.
#
# LO QUE HACE EL HARDWARE
#   El inmediato viaja dentro de la propia palabra de la
#   instruccion. addi lleva un campo de 16 bits; li es una
#   comodidad que el ensamblador expande en instrucciones reales.
#
# LA SOLUCION
#   Colocar primero la constante en un registro y solo entonces
#   dejar que la ALU lea dos registros y escriba en un tercero.
#
# OBSERVE
#   Avance paso a paso y siga $t0, $t1 y $t2 en el panel de
#   Registros. Solo la tercera linea usa la ALU.
# ==========================================================
        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        la   $a0, lbl
        li   $v0, 4
        syscall

        li   $t0, 12            # immediate -> register
        li   $t1, 30            # immediate -> register
        add  $t2, $t0, $t1      # ALU reads two registers

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
