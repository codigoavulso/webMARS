# ==========================================================
# Aula 14 - Numeros reais em 32 bits
#
# O PROBLEMA
#   O 3.5 nao cabe num registo inteiro. Para onde vai a parte
#   fracionaria, e como e que um numero muito grande e guardado
#   nos mesmos 32 bits que um muito pequeno?
#
# O QUE O HARDWARE FAZ
#   O IEEE-754 divide a palavra em tres campos: um bit de sinal,
#   oito bits de expoente e vinte e tres de fracao. O expoente
#   desliza a virgula binaria, e e por isso que o formato se
#   chama virgula flutuante.
#
# A SOLUCAO
#   Um banco de registos proprio ($f0..$f31) e um somador proprio
#   tratam destes valores, e por isso os mnemonicos mudam: lwc1
#   para carregar, add.s para somar, syscall 2 para imprimir.
#
# OBSERVE
#   Abra Ferramentas > Floating Point Representation e escreva
#   3.5. Veja os tres campos e confirme que 4.75 e exato - ao
#   contrario de 0.1, que nao tem fracao binaria finita.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        # Os endereços inteiros localizam os dados; lwc1 transfere os seus bits para COP1.
        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        # carregar nos registos da FPU
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     # somador da FPU

        # A syscall 2 espera o argumento float especificamente em $f12.
        mov.s $f12, $f4
        li   $v0, 2             # imprimir float
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
