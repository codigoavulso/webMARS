# 05 - Comparador y salto
#
# La instrucción `slt` compara dos enteros con signo y escribe 1 si el primero es menor, o 0 en
# caso contrario.
#
# Con 7 y 12, `$t2` vale 1. Por eso, `beq` no salta a `notless` y la ejecución sigue con la
# instrucción siguiente.
#
# Con los saltos retardados desactivados, ejecuta `beq` y observa el PC. Intercambia los dos
# valores de entrada y compara el nuevo destino.

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
