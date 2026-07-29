# ==========================================================
# Clase 12 - La recursion necesita un marco por llamada
#
# EL PROBLEMA
#   Una llamada recursiva sobreescribe $ra y el registro del
#   argumento. La llamada exterior queda sin camino de vuelta y
#   sin saber cual era su propio n.
#
# LO QUE HACE EL HARDWARE
#   Ofrece un $ra, no una pila de ellos. Nada se guarda solo; si
#   el codigo no lo guarda, se pierde.
#
# LA SOLUCION
#   Cada activacion abre un marco en la pila, guarda lo que aun
#   necesitara tras la llamada y lo restaura al salir. La
#   profundidad de la pila es la de la recursion.
#
# OBSERVE
#   Ponga un punto de ruptura en el mul y siga a $sp bajar 8 por
#   nivel. Las cinco copias guardadas de n son lo que hace
#   posible la multiplicacion al regresar.
# ==========================================================
        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int fact(int n) ----
fact:
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        # this call's return address
        sw   $a0, 4($sp)        # this call's n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             # base case: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               # $v0 = (n-1)!
        lw   $a0, 4($sp)        # our n again
        mul  $v0, $v0, $a0

factend:
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
