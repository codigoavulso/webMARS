# 14 - Números reais em 32 bits
#
# Um número de vírgula flutuante de precisão simples tem um bit de sinal, oito de expoente e 23
# de fração.
#
# A instrução `lwc1` copia o padrão de bits para um registo de vírgula flutuante. Depois,
# `add.s` soma 3,5 e 1,25 e obtém 4,75.
#
# Compare as codificações de 4,75 e 0,1 na ferramenta Representação de vírgula flutuante. 4,75 é
# exato, enquanto 0,1 precisa de arredondamento.

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

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
