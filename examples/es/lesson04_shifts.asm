# 04 - Desplazamientos y potencias de dos
#
# Desplazar tres posiciones a la izquierda multiplica por 8 cuando el resultado cabe en el
# registro. Los bits que salen por el extremo se pierden.
#
# A la derecha, `srl` rellena con ceros y `sra` copia el bit de signo. Al desplazar -16 dos
# posiciones, se obtiene 1073741820 y -4, respectivamente.
#
# Prueba -15 con `sra`. El resultado es -4 porque el desplazamiento redondea hacia abajo,
# mientras que la división con signo redondea hacia cero.

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
