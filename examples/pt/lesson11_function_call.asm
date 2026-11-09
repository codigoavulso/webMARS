# 11 - Chamar uma função
#
# Execute com os desvios retardados desativados. A instrução `jal` salta para a função e guarda
# em `$ra` o endereço da instrução seguinte.
#
# A convenção de chamada passa 17 e 42 em `$a0` e `$a1`. A função devolve o maior valor em
# `$v0`.
#
# Entre na função passo a passo, compare `$ra` com o endereço após `jal` e siga `jr $ra` até ao
# código que fez a chamada.

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            # primeiro argumento
        li   $a1, 42            # segundo argumento
        jal  maxof

        move $a0, $v0           # o resultado regressou em $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

# ---- int maxof(int a, int b) ----
maxof:
        # maxof é uma função-folha, portanto pode regressar sem guardar $ra na pilha.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
