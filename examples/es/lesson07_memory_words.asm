# 07 - Palabras en memoria
#
# Las direcciones de memoria cuentan bytes. Cada palabra ocupa cuatro bytes, por eso `lw` y `sw`
# usan aquí los desplazamientos 0, 4 y 8.
#
# La dirección de una palabra debe ser múltiplo de cuatro. En este programa, usar el
# desplazamiento 1 en lugar de 4 provoca una excepción de alineación.
#
# Después de las escrituras, busca `cell` en el Segmento de datos. Las tres palabras
# consecutivas deben contener 111, 222 y 333.

        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          # dirección base

        # Cada desplazamiento es relativo a $t0 y permanece alineado a palabra.
        li   $t1, 111
        sw   $t1, 0($t0)        # primera palabra
        li   $t1, 222
        sw   $t1, 4($t0)        # +4 bytes = palabra siguiente
        li   $t1, 333
        sw   $t1, 8($t0)        # +8 bytes desde la base

        la   $a0, m1
        li   $v0, 4
        syscall

        # lw reconstruye los mismos valores de 32 bits escritos anteriormente por sw.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
