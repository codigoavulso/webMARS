# ==========================================================
# Aula 12 - A recursao precisa de uma trama por chamada
#
# O PROBLEMA
#   Uma chamada recursiva sobrescreve o $ra e o registo do
#   argumento. A chamada exterior fica sem caminho de volta e sem
#   saber qual era o seu proprio n.
#
# O QUE O HARDWARE FAZ
#   Oferece um $ra, nao uma pilha deles. Nada e guardado
#   automaticamente; se o codigo nao guardar, perde-se.
#
# A SOLUCAO
#   Cada ativacao abre uma trama na pilha, guarda o que ainda vai
#   precisar depois da chamada e restaura a saida. A profundidade
#   da pilha e a profundidade da recursao.
#
# OBSERVE
#   Ponha um ponto de parada no mul e siga o $sp a descer 8 por
#   nivel. As cinco copias guardadas de n sao o que torna
#   possivel a multiplicacao no regresso.
# ==========================================================
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
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        # this call's return address
        sw   $a0, 4($sp)        # this call's n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             # base case: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               # $v0 = (n-1)!
        lw   $a0, 4($sp)        # our n again
        mul  $v0, $v0, $a0

factend:
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
