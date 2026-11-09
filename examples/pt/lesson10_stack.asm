# 10 - A pilha
#
# Por convenção, a pilha cresce para endereços mais baixos. Subtraia 8 a `$sp` para reservar
# espaço para duas palavras.
#
# O programa guarda dois registos com `sw`, coloca-os a zero e recupera os valores com `lw`.
#
# Observe `$sp` antes da reserva, durante as duas escritas e depois de libertar o espaço. O
# valor final deve coincidir com o inicial.

        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        # A pilha cresce para baixo, por isso reservar espaço subtrai a $sp.
        addi $sp, $sp, -8       # reservar duas words
        sw   $t0, 0($sp)        # guardar na pilha
        sw   $t1, 4($sp)

        li   $t0, 0             # sobrescrever os registos
        li   $t1, 0

        lw   $t0, 0($sp)        # recuperar da pilha
        lw   $t1, 4($sp)
        # Cada reserva deve ser equilibrada para devolver ao chamador o $sp original.
        addi $sp, $sp, 8        # libertar o frame

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
