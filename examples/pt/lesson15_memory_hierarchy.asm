# ==========================================================
# Aula 15 - Porque o passo altera a velocidade
#
# O PROBLEMA
#   Os dois ciclos abaixo leem o mesmo array e fazem o mesmo
#   numero de leituras. Numa maquina real um deles e muito mais
#   lento. A contagem de instrucoes nao explica isso.
#
# O QUE O HARDWARE FAZ
#   A memoria nao entrega palavras isoladas. Uma falha traz um
#   bloco inteiro, apostando que as palavras vizinhas serao
#   pedidas em breve. Um passo de um cobra essa aposta; um passo
#   de dezasseis paga um bloco e le uma palavra dele.
#
# A SOLUCAO
#   Nada muda no codigo. A localidade e uma propriedade do padrao
#   de acesso, e e o padrao que tem de ser corrigido.
#
# OBSERVE
#   Abra Ferramentas > Data Cache Simulator, prima Connect to
#   MIPS e execute. Compare a taxa de acertos dos dois ciclos. As
#   duas somas dao 0 porque o array esta a zeros - o numero nao
#   interessa aqui, a taxa de acertos e que interessa.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# ---- every word of each block ----
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        # Índices consecutivos reutilizam cada bloco de cache antes de avançar.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# ---- one word per block, sixteen words apart ----
        li   $t1, 0
        li   $t3, 0
far:
        # Somar 16 salta 64 bytes por iteração: normalmente um bloco de cache inteiro.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
