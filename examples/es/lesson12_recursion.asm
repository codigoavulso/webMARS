# 12 - Recursión y tramas
#
# Una llamada recursiva sobrescribe `$ra` y usa `$a0` para su propio argumento. Guarda ambos
# valores antes de la llamada.
#
# Entra en `fact` para cada valor de 5 a 1. Cada llamada reserva ocho bytes, incluida la que
# devuelve 1.
#
# Coloca un punto de interrupción en `mul` para observar el retorno. Cada llamada recupera su
# argumento, multiplica y libera el espacio que reservó en la pila.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int fact(int n) ----
fact:
        # Cada invocación posee un frame distinto de ocho bytes.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        # retorno de esta llamada
        sw   $a0, 4($sp)        # n de esta llamada

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             # caso base: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               # $v0 = (n-1)!
        lw   $a0, 4($sp)        # recuperar nuestro n
        mul  $v0, $v0, $a0

factend:
        # Recupera la dirección de retorno guardada antes de liberar el espacio de esta llamada en la pila.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
