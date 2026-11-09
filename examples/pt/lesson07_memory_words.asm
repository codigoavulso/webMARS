# 07 - Palavras em memória
#
# Os endereços de memória contam bytes. Cada palavra ocupa quatro bytes, por isso `lw` e `sw`
# usam aqui os deslocamentos 0, 4 e 8.
#
# O endereço de uma palavra tem de ser múltiplo de quatro. Neste programa, usar o deslocamento 1
# em vez de 4 provoca uma exceção de alinhamento.
#
# Depois das escritas, veja `cell` no Segmento de dados. As três palavras consecutivas devem
# conter 111, 222 e 333.

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
