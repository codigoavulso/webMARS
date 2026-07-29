# ==========================================================
# Clase 13 - Una instruccion es un numero
#
# EL PROBLEMA
#   El procesador trae palabras de la memoria. El codigo tambien
#   vive en la memoria. Que distingue una instruccion de un dato?
#
# LO QUE HACE EL HARDWARE
#   Nada, mas alla de hacia donde va la palabra. El PC selecciona
#   palabras que van al decodificador; lw selecciona palabras que
#   van al banco de registros. Los bits son de la misma clase.
#
# LA SOLUCION
#   Leer la codificacion directamente. Ensamble y abra
#   Principal > Ejecutar: la columna Code muestra cada
#   instruccion como la palabra de 32 bits que realmente es.
#
# OBSERVE
#   Esta clase no imprime nada a proposito: la salida es el propio
#   Segmento de Texto. Compare los dos add: mismos campos de
#   opcode y funct, numeros de registro distintos. Luego busque
#   el literal 100 dentro de la palabra del addi.
# ==========================================================
        .text
        .globl main
main:
        add  $t0, $t1, $t2      # R-type: opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      # same shape, different registers
        addi $t0, $t1, 100      # I-type: the constant is in the word
        sll  $t0, $t1, 4        # shift amount has its own field
        j    tail               # J-type: an address, not a register
tail:
        li   $v0, 10
        syscall
