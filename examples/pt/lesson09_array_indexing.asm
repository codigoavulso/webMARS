# 09 - Indexar um array
#
# Cada elemento do vetor ocupa quatro bytes. Desloque o índice duas posições à esquerda para
# calcular o deslocamento em bytes.
#
# Siga a sequência `sll`, `add`, `lw`: ajuste a escala do índice, some o endereço base e leia o
# elemento.
#
# No índice 2, `$t5` vale 8 e `$t6` aponta para o valor 30. A soma dos cinco elementos é 150.

        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           # endereço base
        li   $t1, 0             # i
        li   $t2, 5             # comprimento
        li   $t3, 0             # acumulador

sum:
        # Invariante: $t3 contém a soma desde arr[0] até arr[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        # i * 4 bytes
        add  $t6, $t0, $t5      # base + índice escalado
        # $t6 identifica agora um elemento exato; lw carrega o seu valor de 32 bits.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
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
