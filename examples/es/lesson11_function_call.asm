# 11 - Llamar a una función
#
# Ejecuta con los saltos retardados desactivados. La instrucción `jal` salta a la función y
# guarda en `$ra` la dirección de la instrucción siguiente.
#
# La convención de llamada pasa 17 y 42 en `$a0` y `$a1`. La función devuelve el valor mayor en
# `$v0`.
#
# Entra paso a paso en la función, compara `$ra` con la dirección posterior a `jal` y sigue
# `jr $ra` hasta el código que hizo la llamada.

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            # primer argumento
        li   $a1, 42            # segundo argumento
        jal  maxof

        move $a0, $v0           # el resultado volvió en $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int maxof(int a, int b) ----
maxof:
        # maxof es una función hoja; puede devolver sin guardar $ra en la pila.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
