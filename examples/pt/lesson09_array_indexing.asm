# ==========================================================
# Aula 09 - Indexar um array
#
# O PROBLEMA
#   Uma instrucao de leitura oferece um registo base e um
#   deslocamento constante. Mais nada. Como se chega a a[i]
#   quando i so e conhecido em execucao, num registo?
#
# O QUE O HARDWARE FAZ
#   Soma a base ao que o registo contiver. Portanto o indice tem
#   de vir ja em bytes, e nao em elementos.
#
# A SOLUCAO
#   Escalar o indice pelo tamanho do elemento e depois somar.
#   Para palavras de quatro bytes esse escalamento e um
#   deslocamento de dois a esquerda, que nao custa nada.
#
# OBSERVE
#   As tres linhas sll, add, lw sao aquilo em que a[i] se
#   traduz. Percorra uma iteracao e leia $t5 e $t6.
# ==========================================================
        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           # base
        li   $t1, 0             # i
        li   $t2, 5             # length
        li   $t3, 0             # accumulator

sum:
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        # i * 4 bytes
        add  $t6, $t0, $t5      # base + scaled index
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
