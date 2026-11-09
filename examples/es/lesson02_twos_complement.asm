# 02 - Complemento a dos
#
# En complemento a dos de 32 bits, invertir los bits de 5 y sumar 1 produce la representación de
# -5.
#
# El programa calcula el mismo valor de dos formas: con `sub` a partir de cero y después con
# `nor` y `addi`.
#
# Ambos caminos imprimen -5. Busca `0xFFFFFFFB` en los registros para ver los mismos bits en
# hexadecimal.

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
