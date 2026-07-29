# ==========================================================
# Aula 05 - O comparador e o desvio
#
# O PROBLEMA
#   Uma decisao precisa de um bit, mas comparar dois numeros de
#   32 bits e uma subtracao. Como e que uma subtracao decide?
#
# O QUE O HARDWARE FAZ
#   O slt subtrai e descarta tudo menos o sinal, escrevendo 0 ou
#   1. O desvio entrega esse bit a logica do PC, que soma um
#   deslocamento ou deixa o PC avancar.
#
# A SOLUCAO
#   Comparar para um registo e desviar com base nele. O controlo
#   de fluxo e aritmetica mais um multiplexador no PC.
#
# OBSERVE
#   Depois do slt, $t2 vale 1. Passe o beq e siga o PC na barra
#   de estado: ele salta em vez de avancar quatro.
# ==========================================================
        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             # a
        li   $t1, 12            # b
        slt  $t2, $t0, $t1      # t2 = 1 if a < b
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
