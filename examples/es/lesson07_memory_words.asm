# ==========================================================
# Clase 07 - Palabras en memoria, y por que los saltos son de 4
#
# EL PROBLEMA
#   La memoria se direcciona byte a byte, pero un registro tiene
#   cuatro bytes. Que selecciona realmente una direccion?
#
# LO QUE HACE EL HARDWARE
#   lw y sw mueven cuatro bytes en un acceso, asi que palabras
#   consecutivas quedan a cuatro direcciones. Los dos bits bajos
#   deben ser cero: esa alineacion es lo que permite traer una
#   palabra entera en un ciclo.
#
# LA SOLUCION
#   La aritmetica de direcciones es en bytes, asi que un indice de
#   palabras siempre se escala por cuatro.
#
# OBSERVE
#   Ensamble y abra el Segmento de Datos en 0x10010000. Los tres
#   valores aparecen en columnas adyacentes de la misma fila.
# ==========================================================
        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          # base address

        li   $t1, 111
        sw   $t1, 0($t0)        # first word
        li   $t1, 222
        sw   $t1, 4($t0)        # +4 bytes = next word
        li   $t1, 333
        sw   $t1, 8($t0)        # +8 bytes

        la   $a0, m1
        li   $v0, 4
        syscall

        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
