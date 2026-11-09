# 01 - Registos e imediatos
#
# O valor imediato está codificado na instrução. Monte e veja em que instrução básica se traduz
# cada `li`.
#
# Execute os dois carregamentos e a soma passo a passo. Em Registos, siga `$t0 = 12`, `$t1 = 30`
# e `$t2 = 42`.
#
# Troque 30 por `0x12345678` e volte a montar. A constante maior precisa de mais de uma
# instrução básica.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        # As syscalls usam $v0 como seletor e $a0 como primeiro argumento.
        la   $a0, lbl
        li   $v0, 4
        syscall

        # li é uma pseudoinstrução; Assemble mostra em que instrução real se transforma.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # A soma fica num registo diferente.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
