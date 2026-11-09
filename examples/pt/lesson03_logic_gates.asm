# 03 - Portas lógicas em 32 bits
#
# Cada bit do resultado depende apenas dos bits na mesma posição nos dois operandos. Não há
# transporte entre posições.
#
# Com a máscara `0x0F`, AND conserva os quatro bits inferiores e limpa os restantes. OR põe os
# quatro inferiores a 1 e XOR inverte-os.
#
# Compare os três resultados em hexadecimal e experimente a máscara `0xF0` para trabalhar sobre
# o grupo seguinte de quatro bits.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           # 0xCC
        li   $t1, 15            # máscara 0x0F

        la   $a0, ma
        li   $v0, 4
        syscall
        # AND apaga cada posição onde a máscara contém zero.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        # XOR inverte apenas as posições selecionadas pelos uns da máscara.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
