# ==========================================================
# Aula 04 - Deslocamentos, ou multiplicar com fios
#
# O PROBLEMA
#   Um multiplicador geral e um dos blocos mais caros de um
#   datapath. Multiplicar por 8 nao devia custar tanto.
#
# O QUE O HARDWARE FAZ
#   Um deslocamento nao e aritmetica: sao os mesmos bits lidos a
#   partir de fios diferentes. Deslocar n a esquerda multiplica
#   por 2^n e custa apenas encaminhamento.
#
# A SOLUCAO
#   Potencias de dois passam a deslocamentos. Repare nos dois
#   deslocamentos a direita: o srl entra com zeros no topo, o sra
#   copia o bit de sinal, logo so o sra divide bem um negativo.
#
# OBSERVE
#   -16 >> 2 da -4 com sra, mas um positivo enorme com srl. Os
#   bits andaram igual; muda so o que entrou no topo.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        sra  $t3, $t2, 2        # sign preserved: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        # zeros shifted in: huge positive
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
