# ==========================================================
# Aula 03 - Portas logicas em 32 bits
#
# O PROBLEMA
#   AND, OR e XOR sao portas de um bit. Um registo tem 32 bits.
#   O que significa uma porta com essa largura?
#
# O QUE O HARDWARE FAZ
#   Coloca 32 copias da porta lado a lado. O bit 0 do resultado
#   depende so do bit 0 de cada operando, o bit 1 so do bit 1, e
#   assim por diante. Nao ha transporte entre eles.
#
# A SOLUCAO
#   E essa independencia que faz a mascara funcionar: escolher os
#   bits a manter com AND, forcar a um com OR, inverter com XOR.
#
# OBSERVE
#   0xCC e 11001100 e a mascara 0x0F e 00001111. O AND mantem os
#   quatro bits baixos, o OR poe-nos a um, o XOR inverte-os. So o
#   nibble baixo muda.
# ==========================================================
        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           # 0xCC
        li   $t1, 15            # 0x0F mask

        la   $a0, ma
        li   $v0, 4
        syscall
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
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
