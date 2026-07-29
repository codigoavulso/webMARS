# ==========================================================
# Clase 08 - Bytes dentro de una palabra, y orden de bytes
#
# EL PROBLEMA
#   Una palabra ocupa cuatro direcciones. A cual de los bytes se
#   refiere la mas baja de ellas?
#
# LO QUE HACE EL HARDWARE
#   Esa eleccion es el orden de bytes, una decision de cableado
#   tomada una vez para toda la maquina. Aqui MIPS es
#   little-endian: el byte menos significativo esta en la
#   direccion mas baja.
#
# LA SOLUCION
#   Guardar una palabra y leerla byte a byte, dejando que el orden
#   responda la pregunta.
#
# OBSERVE
#   0x04030201 sale como 1 2 3 4. El byte escrito ultimo en el
#   literal se lee primero. Se usa lbu y no lb para que un byte
#   por encima de 127 no se extienda con signo.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    # byte 01 is least significant
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             # byte offset
bloop:
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        # unsigned byte
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
