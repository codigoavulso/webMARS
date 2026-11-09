# 12 - Recursão e tramas
#
# Uma chamada recursiva substitui `$ra` e usa `$a0` para o seu próprio argumento. Guarde ambos
# os valores antes da chamada.
#
# Entre em `fact` para cada valor de 5 a 1. Cada chamada reserva oito bytes, incluindo a que
# devolve 1.
#
# Coloque um ponto de paragem em `mul` para observar o regresso. Cada chamada recupera o seu
# argumento, multiplica e liberta o espaço que reservou na pilha.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int fact(int n) ----
fact:
        # Cada invocação possui um frame distinto de oito bytes.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        # retorno desta chamada
        sw   $a0, 4($sp)        # n desta chamada

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             # caso base: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               # $v0 = (n-1)!
        lw   $a0, 4($sp)        # recuperar o nosso n
        mul  $v0, $v0, $a0

factend:
        # Recupere o endereço de retorno guardado antes de libertar o espaço desta chamada na pilha.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
