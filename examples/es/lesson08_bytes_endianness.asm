# 08 - Bytes y orden de bytes
#
# En la memoria little-endian de este simulador, el byte menos significativo de una palabra
# queda en la dirección más baja.
#
# Guarda `0x04030201` como palabra y lee los bytes de los desplazamientos 0 a 3. El resultado es
# 1, 2, 3, 4.
#
# Prueba `0xFF` como byte menos significativo. La carga sin signo con `lbu` da 255 y la carga
# con signo con `lb` da -1.

        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    # el byte 01 es el menos significativo
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             # desplazamiento en bytes
bloop:
        # El bucle visita los desplazamientos 0, 1, 2 y 3 dentro de la palabra.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        # Dirección efectiva = dirección base + desplazamiento actual.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        # byte sin signo
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
