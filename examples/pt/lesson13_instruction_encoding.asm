# ==========================================================
# Aula 13 - Uma instrucao e um numero
#
# O PROBLEMA
#   O processador busca palavras da memoria. O codigo tambem vive
#   na memoria. Entao o que distingue uma instrucao de um dado?
#
# O QUE O HARDWARE FAZ
#   Nada, para alem de para onde a palavra e encaminhada. O PC
#   seleciona palavras que vao para o descodificador; o lw
#   seleciona palavras que vao para o banco de registos. Os bits
#   sao da mesma natureza.
#
# A SOLUCAO
#   Ler a codificacao diretamente. Monte e abra
#   Principal > Executar: a coluna Code mostra cada instrucao
#   como a palavra de 32 bits que realmente e.
#
# OBSERVE
#   Esta aula nao imprime nada de proposito - a saida e o proprio
#   Segmento de Texto. Compare os dois add: mesmos campos de
#   opcode e funct, numeros de registo diferentes. Depois
#   encontre o literal 100 dentro da palavra do addi.
# ==========================================================
        .text
        .globl main
main:
        add  $t0, $t1, $t2      # R-type: opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      # same shape, different registers
        addi $t0, $t1, 100      # I-type: the constant is in the word
        sll  $t0, $t1, 4        # shift amount has its own field
        j    tail               # J-type: an address, not a register
tail:
        li   $v0, 10
        syscall
