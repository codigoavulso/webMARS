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
        # Depois de montar, observe Code: estes mnemónicos não são guardados como texto.
        add  $t0, $t1, $t2      # tipo R: opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      # mesmo formato, outros registos
        addi $t0, $t1, 100      # tipo I: a constante está na word
        sll  $t0, $t1, 4        # o deslocamento tem o seu próprio campo
        j    tail               # tipo J: um endereço, não um registo
tail:
        # li também é expandido antes da execução; o processador só vê words codificadas.
        li   $v0, 10
        syscall
