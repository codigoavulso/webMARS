# ==========================================================
# Aula 06 - Um contador, em software e em hardware
#
# O PROBLEMA
#   Um contador em hardware e um registo, um incrementador e um
#   comparador. Como e essa mesma maquina escrita em instrucoes?
#
# O QUE O HARDWARE FAZ
#   Exatamente essas tres pecas, uma por instrucao: o registo
#   guarda a contagem, o addi e o incrementador, e o slt com o
#   desvio e o comparador que decide dar outra volta.
#
# A SOLUCAO
#   Um ciclo nao e um conceito novo. E logica sequencial escrita
#   por extenso, com o PC no papel de relogio.
#
# OBSERVE
#   $t0 e o registo de contagem e $t1 o limite. Percorra uma
#   volta completa e diga qual linha e qual peca.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             # the count register
        li   $t1, 11            # the limit

loop:
        slt  $t2, $t0, $t1      # comparator
        beq  $t2, $zero, endl   # exit when count reaches limit

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t0, $t0, 1        # the adder
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
