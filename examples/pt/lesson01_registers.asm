# ==========================================================
# Aula 01 - Registos e valores imediatos
#
# O PROBLEMA
#   A ALU tem duas portas de entrada e ambas estao ligadas ao
#   banco de registos. Um numero escrito no codigo nao esta num
#   registo, logo nao chega a essas portas diretamente.
#
# O QUE O HARDWARE FAZ
#   O imediato viaja dentro da propria palavra da instrucao.
#   O addi carrega um campo de 16 bits; o li e uma comodidade
#   que o assembler expande em uma ou duas instrucoes reais.
#
# A SOLUCAO
#   Colocar primeiro a constante num registo e so depois deixar
#   a ALU ler dois registos e escrever num terceiro.
#
# OBSERVE
#   De um passo por linha e siga $t0, $t1 e $t2 no painel de
#   Registos. So a terceira linha usa a ALU.
# ==========================================================
        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        la   $a0, lbl
        li   $v0, 4
        syscall

        li   $t0, 12            # immediate -> register
        li   $t1, 30            # immediate -> register
        add  $t2, $t0, $t1      # ALU reads two registers

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
