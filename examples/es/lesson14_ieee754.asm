# ==========================================================
# Clase 14 - Numeros reales en 32 bits
#
# EL PROBLEMA
#   3.5 no cabe en un registro entero. Adonde va la parte
#   fraccionaria, y como se guarda un numero muy grande en los
#   mismos 32 bits que uno muy pequeno?
#
# LO QUE HACE EL HARDWARE
#   IEEE-754 divide la palabra en tres campos: un bit de signo,
#   ocho de exponente y veintitres de fraccion. El exponente
#   desliza la coma binaria, y de ahi el nombre coma flotante.
#
# LA SOLUCION
#   Un banco de registros propio ($f0..$f31) y un sumador propio
#   tratan estos valores, y por eso cambian los mnemonicos: lwc1
#   para cargar, add.s para sumar, syscall 2 para imprimir.
#
# OBSERVE
#   Abra Herramientas > Floating Point Representation y escriba
#   3.5. Vea los tres campos y compruebe que 4.75 es exacto, a
#   diferencia de 0.1, que no tiene fraccion binaria finita.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        # into the FPU register file
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     # the FPU adder

        mov.s $f12, $f4
        li   $v0, 2             # print float
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
