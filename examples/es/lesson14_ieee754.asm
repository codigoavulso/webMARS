# 14 - Números reales en 32 bits
#
# Un número de coma flotante de precisión simple tiene un bit de signo, ocho de exponente y 23
# de fracción.
#
# La instrucción `lwc1` copia el patrón de bits en un registro de coma flotante. Luego, `add.s`
# suma 3,5 y 1,25 y obtiene 4,75.
#
# Compara las codificaciones de 4,75 y 0,1 en la herramienta de representación de coma flotante.
# 4,75 es exacto y 0,1 necesita redondeo.

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
        lwc1 $f0, 0($t0)        # cargar en los registros de la FPU
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     # sumador de la FPU

        # La syscall 2 espera su argumento float específicamente en $f12.
        mov.s $f12, $f4
        li   $v0, 2             # imprimir float
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
