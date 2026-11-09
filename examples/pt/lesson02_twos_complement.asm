# 02 - Complemento para dois
#
# Em complemento para dois de 32 bits, inverter os bits de 5 e somar 1 produz a representação de
# -5.
#
# O programa calcula o mesmo valor de duas formas: com `sub` a partir de zero e depois com `nor`
# e `addi`.
#
# Ambos os caminhos imprimem -5. Veja `0xFFFFFFFB` nos registos para observar os mesmos bits em
# hexadecimal.

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        # Subtrair a partir de zero cria o inverso aditivo sem um bit de sinal separado.
        li   $t0, 5
        sub  $t1, $zero, $t0    # o somador realiza o trabalho
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        # nor com $zero equivale a NOT; somar um completa o complemento para dois.
        nor  $t2, $t0, $zero    # inverter todos os bits
        addi $t2, $t2, 1        # somar um
        move $a0, $t2           # mesmo valor obtido acima
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
