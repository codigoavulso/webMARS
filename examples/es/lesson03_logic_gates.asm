# ==========================================================
# Clase 03 - Puertas logicas en 32 bits
#
# EL PROBLEMA
#   AND, OR y XOR son puertas de un bit. Un registro tiene 32.
#   Que significa una puerta con esa anchura?
#
# LO QUE HACE EL HARDWARE
#   Pone 32 copias de la puerta en paralelo. El bit 0 del
#   resultado depende solo del bit 0 de cada operando, el bit 1
#   solo del bit 1. No hay acarreo entre ellos.
#
# LA SOLUCION
#   Esa independencia es lo que hace funcionar una mascara: elegir
#   bits con AND, forzarlos a uno con OR, invertirlos con XOR.
#
# OBSERVE
#   0xCC es 11001100 y la mascara 0x0F es 00001111. AND mantiene
#   los cuatro bits bajos, OR los pone a uno, XOR los invierte.
#   Solo cambia el nibble bajo.
# ==========================================================
        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           # 0xCC
        li   $t1, 15            # 0x0F mask

        la   $a0, ma
        li   $v0, 4
        syscall
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
