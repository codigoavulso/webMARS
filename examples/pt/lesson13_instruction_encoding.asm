# 13 - Uma instrução é um número
#
# Monte e observe a coluna Código no Segmento de texto. Cada instrução básica é uma palavra de
# 32 bits dividida em campos.
#
# Compare as duas instruções `add`. Os campos da operação coincidem, enquanto os campos dos
# registos codificam os operandos diferentes.
#
# Em `addi`, os 16 bits inferiores guardam o imediato 100, ou `0x0064`. Mude-o para 101 e volte
# a montar para ver a diferença.

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
