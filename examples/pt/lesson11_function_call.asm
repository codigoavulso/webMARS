# ==========================================================
# Aula 11 - Chamar uma funcao
#
# O PROBLEMA
#   Saltar para uma rotina e facil. Voltar nao e, porque a mesma
#   rotina pode ser chamada de muitos sitios e o endereco de
#   retorno e diferente de cada vez.
#
# O QUE O HARDWARE FAZ
#   O jal faz duas coisas numa instrucao: guarda o endereco da
#   instrucao seguinte em $ra e depois salta. O jr salta para o
#   que um registo contiver, logo jr $ra regressa.
#
# A SOLUCAO
#   Tudo o resto e acordo, nao circuito: argumentos em $a0..$a3,
#   resultados em $v0. Quebre a convencao e o codigo continua a
#   montar - simplesmente deixa de interoperar.
#
# OBSERVE
#   Pare sobre o jal e leia o $ra. Compare-o com o endereco da
#   linha seguinte a chamada no Segmento de Texto.
# ==========================================================
        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            # first argument
        li   $a1, 42            # second argument
        jal  maxof              # $ra = address of the next line

        move $a0, $v0           # result came back in $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int maxof(int a, int b) ----
maxof:
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
