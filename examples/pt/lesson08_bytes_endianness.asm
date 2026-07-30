# ==========================================================
# Aula 08 - Bytes dentro de uma palavra, e ordem dos bytes
#
# O PROBLEMA
#   Uma palavra ocupa quatro enderecos. Qual dos bytes e que o
#   mais baixo desses enderecos designa?
#
# O QUE O HARDWARE FAZ
#   Essa escolha e a ordem dos bytes, uma decisao de cablagem
#   tomada uma vez para a maquina toda. Aqui o MIPS e
#   little-endian: o byte menos significativo fica no endereco
#   mais baixo.
#
# A SOLUCAO
#   Guardar uma palavra e le-la byte a byte, deixando a ordem
#   responder a pergunta.
#
# OBSERVE
#   0x04030201 sai como 1 2 3 4. O byte escrito por ultimo no
#   literal e lido primeiro. Usa-se lbu e nao lb para que um byte
#   acima de 127 nao seja estendido com sinal.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    # o byte 01 é o menos significativo
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             # deslocamento em bytes
bloop:
        # O ciclo visita os deslocamentos 0, 1, 2 e 3 dentro da word.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        # Endereço efetivo = endereço base + deslocamento atual.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        # byte sem sinal
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
