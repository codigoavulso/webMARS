# 15 - Por qué el paso cambia la velocidad
#
# Los dos bucles usan el mismo vector. El primero lee las 256 palabras y el segundo lee una de
# cada 16, con un total de 16 cargas.
#
# Con bloques de caché de 16 palabras, las lecturas consecutivas pueden reutilizar cada bloque
# cargado. El segundo bucle avanza un bloque en cada carga.
#
# Conecta el simulador a MIPS, marca «Activado» y fija el tamaño de bloque en 16 palabras.
# En el Simulador de caché de datos, detente en `far` para analizar el primer bucle. Reinicia
# allí las estadísticas de caché antes del segundo bucle y compara las tasas de aciertos.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Recorrido secuencial por las 256 palabras.
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        # Los índices consecutivos reutilizan cada bloque de caché antes de avanzar.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# Recorrido con una carga cada dieciséis palabras.
        li   $t1, 0
        li   $t3, 0
far:
        # La siguiente dirección queda a 64 bytes, es decir, dieciséis palabras de cuatro bytes.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
