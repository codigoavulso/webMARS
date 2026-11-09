# 04 - Deslocamentos e potências de dois
#
# Deslocar três posições à esquerda multiplica por 8 quando o resultado cabe no registo. Os bits
# que saem pela extremidade perdem-se.
#
# À direita, `srl` preenche com zeros e `sra` replica o bit de sinal. Ao deslocar -16 duas
# posições, espere 1073741820 e -4, respetivamente.
#
# Experimente -15 com `sra`. O resultado é -4 porque o deslocamento arredonda por defeito,
# enquanto a divisão com sinal arredonda para zero.

        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        # Três deslocamentos multiplicam por 2^3, conservando apenas 32 bits.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        # Comparar $t3 e $t4 em hexadecimal revela os diferentes bits de entrada.
        sra  $t3, $t2, 2        # preserva o sinal: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        # entram zeros: positivo enorme
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
