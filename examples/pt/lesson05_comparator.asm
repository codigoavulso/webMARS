# 05 - Comparador e desvio
#
# A instrução `slt` compara dois inteiros com sinal e escreve 1 se o primeiro for menor, ou 0
# caso contrário.
#
# Com 7 e 12, `$t2` vale 1. Por isso, `beq` não salta para `notless` e a execução segue para a
# instrução seguinte.
#
# Com os desvios retardados desativados, passe por `beq` e observe o PC. Troque os dois valores
# de entrada e compare o novo destino.

        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             # a
        li   $t1, 12            # b
        # slt materializa a comparação como um inteiro normal, sem flags ocultos.
        slt  $t2, $t0, $t1      # t2 = 1 se a < b
        # Saltar para notless apenas quando o resultado booleano for zero.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
