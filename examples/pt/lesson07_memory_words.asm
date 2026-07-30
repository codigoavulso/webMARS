# ==========================================================
# Aula 07 - Palavras em memoria, e porque os enderecos saltam 4
#
# O PROBLEMA
#   A memoria e enderecada byte a byte, mas um registo tem quatro
#   bytes. O que e que um endereco seleciona de facto?
#
# O QUE O HARDWARE FAZ
#   O lw e o sw movem quatro bytes num unico acesso, logo palavras
#   consecutivas ficam a quatro enderecos de distancia. Os dois
#   bits baixos do endereco tem de ser zero: e esse alinhamento
#   que permite buscar uma palavra inteira num ciclo.
#
# A SOLUCAO
#   A aritmetica de enderecos e feita em bytes, logo um indice de
#   palavras e sempre escalado por quatro.
#
# OBSERVE
#   Monte e abra o Segmento de Dados em 0x10010000. Os tres
#   valores aparecem em colunas adjacentes da mesma linha.
# ==========================================================
        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          # endereço base

        # Cada deslocamento é relativo a $t0 e permanece alinhado a uma word.
        li   $t1, 111
        sw   $t1, 0($t0)        # primeira word
        li   $t1, 222
        sw   $t1, 4($t0)        # +4 bytes = word seguinte
        li   $t1, 333
        sw   $t1, 8($t0)        # +8 bytes desde a base

        la   $a0, m1
        li   $v0, 4
        syscall

        # lw reconstrói os mesmos valores de 32 bits anteriormente escritos por sw.
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
