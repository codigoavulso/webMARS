# ==========================================================
# Clase 10 - La pila es un registro y un desplazamiento
#
# EL PROBLEMA
#   Hay 32 registros y los comparte todo el codigo. Donde va un
#   valor que debe sobrevivir a trabajo que reutilizara esos
#   registros?
#
# LO QUE HACE EL HARDWARE
#   Nada especial. $sp es un registro corriente que apunta a la
#   memoria, y la pila crece hacia direcciones mas bajas solo por
#   convencion.
#
# LA SOLUCION
#   Reservar espacio es restar a $sp, liberarlo es sumar. Apilar y
#   desapilar son solo sw y lw.
#
# OBSERVE
#   Los registros se limpian a proposito entre las escrituras y
#   las lecturas, asi que los valores impresos solo pueden venir
#   de la memoria. Siga a $sp moverse 8 y volver.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        # La pila crece hacia abajo, por eso reservar resta a $sp.
        addi $sp, $sp, -8       # reservar dos palabras
        sw   $t0, 0($sp)        # guardar en la pila
        sw   $t1, 4($sp)

        li   $t0, 0             # sobrescribir los registros
        li   $t1, 0

        lw   $t0, 0($sp)        # recuperar de la pila
        lw   $t1, 4($sp)
        # Cada reserva debe quedar equilibrada para devolver al llamador su $sp original.
        addi $sp, $sp, 8        # liberar el frame

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
