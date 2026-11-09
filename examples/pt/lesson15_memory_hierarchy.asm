# 15 - Porque o passo altera a velocidade
#
# Os dois ciclos usam o mesmo vetor. O primeiro lê as 256 palavras e o segundo lê uma palavra em
# cada 16, num total de 16 leituras.
#
# Com blocos de cache de 16 palavras, as leituras consecutivas podem reutilizar cada bloco
# carregado. O segundo ciclo avança um bloco em cada leitura.
#
# Ligue o simulador ao MIPS, marque «Ativado» e defina blocos de 16 palavras.
# No Simulador de cache de dados, pare em `far` para analisar o primeiro ciclo. Reinicie aí as
# estatísticas da cache antes do segundo ciclo e compare as taxas de acerto.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Passagem sequencial pelas 256 palavras.
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

# Passagem com uma leitura a cada dezasseis palavras.
        li   $t1, 0
        li   $t3, 0
far:
        # O endereço seguinte fica 64 bytes adiante, ou seja, dezasseis palavras de quatro bytes.
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
