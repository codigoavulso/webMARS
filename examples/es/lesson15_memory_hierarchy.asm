# ==========================================================
# Clase 15 - Por que el paso cambia la velocidad
#
# EL PROBLEMA
#   Los dos bucles de abajo leen el mismo array y hacen el mismo
#   numero de lecturas. En una maquina real uno es mucho mas
#   lento. El recuento de instrucciones no lo explica.
#
# LO QUE HACE EL HARDWARE
#   La memoria no entrega palabras aisladas. Un fallo trae un
#   bloque entero, apostando que las palabras vecinas se pediran
#   pronto. Un paso de uno cobra esa apuesta; un paso de dieciseis
#   paga un bloque y lee una palabra de el.
#
# LA SOLUCION
#   Nada cambia en el codigo. La localidad es una propiedad del
#   patron de acceso, y es el patron lo que hay que corregir.
#
# OBSERVE
#   Abra Herramientas > Data Cache Simulator, pulse Connect to
#   MIPS y ejecute. Compare la tasa de aciertos de los dos
#   bucles. Ambas sumas dan 0 porque el array esta a ceros: el
#   numero no importa aqui, importa la tasa de aciertos.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# ---- every word of each block ----
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

# ---- one word per block, sixteen words apart ----
        li   $t1, 0
        li   $t3, 0
far:
        # Sumar 16 salta 64 bytes por iteración: normalmente un bloque de caché entero.
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
