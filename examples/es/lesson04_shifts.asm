# ==========================================================
# Clase 04 - Desplazamientos, o multiplicar con cables
#
# EL PROBLEMA
#   Un multiplicador general es uno de los bloques mas caros de
#   un datapath. Multiplicar por 8 no deberia costar tanto.
#
# LO QUE HACE EL HARDWARE
#   Un desplazamiento no es aritmetica: son los mismos bits leidos
#   desde cables distintos. Desplazar n a la izquierda multiplica
#   por 2^n y solo cuesta enrutado.
#
# LA SOLUCION
#   Las potencias de dos pasan a ser desplazamientos. Fijese en
#   los dos a la derecha: srl mete ceros arriba, sra copia el bit
#   de signo, asi que solo sra divide bien un negativo.
#
# OBSERVE
#   -16 >> 2 da -4 con sra, pero un positivo enorme con srl. Los
#   bits se movieron igual; cambia lo que entro por arriba.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        # Tres desplazamientos multiplican por 2^3 conservando solo 32 bits.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        # Compara $t3 y $t4 en hexadecimal para observar los bits que entran.
        sra  $t3, $t2, 2        # conserva el signo: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        # entran ceros: positivo enorme
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
