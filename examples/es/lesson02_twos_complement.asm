# ==========================================================
# Clase 02 - Complemento a dos
#
# EL PROBLEMA
#   Un registro son 32 cables, cada uno alto o bajo. No hay cable
#   para el signo menos, y aun asi los negativos deben funcionar.
#
# LO QUE HACE EL HARDWARE
#   Lee el bit superior como signo, pero no como bandera aparte:
#   -n se guarda como el patron de bits que, sumado a n, da la
#   vuelta hasta cero. Invertir los bits y sumar uno lo consigue.
#
# LA SOLUCION
#   La resta no necesita un segundo circuito. a - b pasa a ser
#   a + (-b), asi que un solo sumador sirve para ambas.
#
# OBSERVE
#   Ambas mitades imprimen -5. La segunda llega por el camino
#   largo, con nor y addi, mostrando lo que hace sub por dentro.
#   Ponga los Valores en hexadecimal para ver 0xFFFFFFFB.
# ==========================================================
        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        # Restar desde cero crea el inverso aditivo sin ningún bit de signo separado.
        li   $t0, 5
        sub  $t1, $zero, $t0    # el sumador realiza el trabajo
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        # nor con $zero equivale a NOT; sumar uno completa el complemento a dos.
        nor  $t2, $t0, $zero    # invertir todos los bits
        addi $t2, $t2, 1        # sumar uno
        move $a0, $t2           # mismo valor que arriba
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
