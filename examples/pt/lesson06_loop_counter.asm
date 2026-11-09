# 06 - Ciclo como contador
#
# O registo `$t0` guarda o próximo número a imprimir. O limite em `$t1` é exclusivo, pelo que 11
# faz imprimir de 1 a 10.
#
# A comparação é feita antes de cada iteração. O incremento aproxima o contador do limite e o
# salto repete a verificação.
#
# Mude o limite para 1 e execute. O salto de saída ocorre antes da primeira impressão.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             # registo contador
        li   $t1, 11            # limite exclusivo

loop:
        # Ao testar a condição, $t0 é o próximo candidato. Só o imprima se for menor que $t1.
        slt  $t2, $t0, $t1      # comparador
        beq  $t2, $zero, endl   # sair ao atingir o limite

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        # Incrementar antes do salto garante progresso em direção ao fim.
        addi $t0, $t0, 1        # incrementador
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
