# ==========================================================
# Aula 02 - Complemento para dois
#
# O PROBLEMA
#   Um registo sao 32 fios, cada um a nivel alto ou baixo. Nao ha
#   fio para o sinal de menos, e ainda assim os negativos tem de
#   funcionar.
#
# O QUE O HARDWARE FAZ
#   Le o bit de topo como sinal, mas nao como flag separada: -n e
#   guardado como o padrao de bits que, somado a n, da a volta
#   ate zero. Inverter todos os bits e somar um chega la.
#
# A SOLUCAO
#   A subtracao nao precisa de um segundo circuito. a - b passa a
#   a + (-b), logo um unico somador serve as duas operacoes.
#
# OBSERVE
#   As duas metades imprimem -5. A segunda chega la pelo caminho
#   longo, com nor e addi, mostrando o que o sub faz por dentro.
#   Ponha os Valores em hexadecimal para ver 0xFFFFFFFB.
# ==========================================================
        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        sub  $t1, $zero, $t0    # the adder does the work
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        nor  $t2, $t0, $zero    # invert all bits
        addi $t2, $t2, 1        # add one
        move $a0, $t2           # same value as above
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
