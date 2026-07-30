# ==========================================================
# Clase 05 - El comparador y el salto
#
# EL PROBLEMA
#   Una decision necesita un bit, pero comparar dos numeros de 32
#   bits es una resta. Como decide una resta?
#
# LO QUE HACE EL HARDWARE
#   slt resta y descarta todo menos el signo, escribiendo 0 o 1.
#   El salto entrega ese bit a la logica del PC, que suma un
#   desplazamiento o deja avanzar el PC.
#
# LA SOLUCION
#   Comparar a un registro y saltar segun ese registro. El control
#   de flujo es aritmetica mas un multiplexor en el PC.
#
# OBSERVE
#   Tras slt, $t2 vale 1. Pase el beq y siga el PC en la barra de
#   estado: salta en lugar de avanzar cuatro.
# ==========================================================
        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             # a
        li   $t1, 12            # b
        # slt materializa la comparación como un entero normal, no como flags ocultos.
        slt  $t2, $t0, $t1      # t2 = 1 si a < b
        # Saltar a notless únicamente cuando el resultado booleano sea cero.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
