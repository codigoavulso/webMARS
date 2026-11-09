# 06 - Bucle como contador
#
# El registro `$t0` guarda el siguiente número que se imprime. El límite en `$t1` es exclusivo,
# así que 11 hace que se imprima del 1 al 10.
#
# La comparación se hace antes de cada iteración. El incremento acerca el contador al límite y
# el salto repite la comprobación.
#
# Cambia el límite a 1 y ejecuta. El salto de salida se toma antes de la primera impresión.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             # registro contador
        li   $t1, 11            # límite exclusivo

loop:
        # Al comprobar la condición, $t0 es el siguiente candidato. Imprímelo solo si es menor que $t1.
        slt  $t2, $t0, $t1      # comparador
        beq  $t2, $zero, endl   # salir al alcanzar el límite

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        # Incrementar antes del salto garantiza el avance hacia la terminación.
        addi $t0, $t0, 1        # incrementador
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
