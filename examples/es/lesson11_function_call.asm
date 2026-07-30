# ==========================================================
# Clase 11 - Llamar a una funcion
#
# EL PROBLEMA
#   Saltar a una rutina es facil. Volver no lo es, porque la misma
#   rutina puede llamarse desde muchos sitios y la direccion de
#   retorno cambia cada vez.
#
# LO QUE HACE EL HARDWARE
#   jal hace dos cosas en una instruccion: guarda la direccion de
#   la siguiente instruccion en $ra y luego salta. jr salta a lo
#   que contenga un registro, asi que jr $ra retorna.
#
# LA SOLUCION
#   Todo lo demas es acuerdo, no circuito: argumentos en
#   $a0..$a3, resultados en $v0. Rompa la convencion y el codigo
#   sigue ensamblando; solo deja de interoperar.
#
# OBSERVE
#   Parese en el jal y lea $ra. Compare con la direccion de la
#   linea siguiente a la llamada en el Segmento de Texto.
# ==========================================================
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
        # jal cambia el flujo de control y $ra en una sola operación arquitectónica.
        jal  maxof              # $ra = dirección de retorno

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
