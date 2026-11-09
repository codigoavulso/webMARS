# 08 - Bytes e ordem dos bytes
#
# Na memória little-endian deste simulador, o byte menos significativo de uma palavra fica no
# endereço mais baixo.
#
# Guarde `0x04030201` como palavra e leia os bytes nos deslocamentos de 0 a 3. O resultado é 1,
# 2, 3, 4.
#
# Experimente `0xFF` no byte menos significativo. A leitura sem sinal com `lbu` dá 255, e a
# leitura com sinal com `lb` dá -1.

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
