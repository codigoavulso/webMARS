# ==========================================================
# Clase 06 - Un contador, en software y en hardware
#
# EL PROBLEMA
#   Un contador en hardware es un registro, un incrementador y un
#   comparador. Como es esa misma maquina en instrucciones?
#
# LO QUE HACE EL HARDWARE
#   Exactamente esas tres piezas, una por instruccion: el registro
#   guarda la cuenta, addi es el incrementador, y slt con el salto
#   es el comparador que decide dar otra vuelta.
#
# LA SOLUCION
#   Un bucle no es un concepto nuevo. Es logica secuencial escrita
#   en detalle, con el PC como reloj.
#
# OBSERVE
#   $t0 es el registro de cuenta y $t1 el limite. Recorra una
#   vuelta completa y diga que linea es que pieza.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             # registro contador
        li   $t1, 11            # límite exclusivo

loop:
        # Invariante: $t0 es el próximo valor que se imprimirá y sigue por debajo de $t1.
        slt  $t2, $t0, $t1      # comparador
        beq  $t2, $zero, endl   # salir al alcanzar el límite

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        # Incrementar antes del salto garantiza el avance hacia la terminación.
        addi $t0, $t0, 1        # incrementador
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
