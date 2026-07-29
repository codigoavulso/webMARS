# ==========================================================
# Aula 10 - A pilha e um registo e um deslocamento
#
# O PROBLEMA
#   Existem 32 registos e sao partilhados por todo o codigo. Onde
#   fica um valor que tem de sobreviver a trabalho que vai
#   reutilizar esses registos?
#
# O QUE O HARDWARE FAZ
#   Nada de especial. O $sp e um registo comum que aponta para a
#   memoria, e a pilha cresce para enderecos mais baixos apenas
#   por convencao.
#
# A SOLUCAO
#   Reservar espaco e subtrair ao $sp, libertar e somar. Empilhar
#   e desempilhar sao apenas sw e lw.
#
# OBSERVE
#   Os registos sao limpos de proposito entre as escritas e as
#   leituras, logo os valores impressos so podem ter voltado da
#   memoria. Siga o $sp a mover-se 8 e a regressar.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        addi $sp, $sp, -8       # reserve two words
        sw   $t0, 0($sp)        # push
        sw   $t1, 4($sp)

        li   $t0, 0             # clobber the registers
        li   $t1, 0

        lw   $t0, 0($sp)        # pop
        lw   $t1, 4($sp)
        addi $sp, $sp, 8        # release

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
