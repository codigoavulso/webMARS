# 10 - La pila
#
# Por convención, la pila crece hacia direcciones más bajas. Resta 8 a `$sp` para reservar
# espacio para dos palabras.
#
# El programa guarda dos registros con `sw`, los pone a cero y recupera sus valores con `lw`.
#
# Observa `$sp` antes de reservar, durante las dos escrituras y después de liberar el espacio.
# El valor final debe coincidir con el inicial.

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
