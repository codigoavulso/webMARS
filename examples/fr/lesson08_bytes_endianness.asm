# 08 - Octets et ordre des octets
#
# Dans la mémoire petit-boutiste de ce simulateur, l'octet de poids faible d'un mot réside à
# l'adresse la plus basse.
#
# Stockez `0x04030201` sous forme de mot et lisez les décalages de 0 à 3 sous forme d'octets. La
# sortie est 1, 2, 3, 4.
#
# Essayez un octet faible de `0xFF`. Une charge non signée avec `lbu` donne 255, tandis qu'une
# charge signée avec `lb` donne -1.

        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #l'octet 01 est le moins significatif
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #décalage d'octet
bloop:
        #La boucle visite les décalages 0, 1, 2 et 3 à l'intérieur du mot stocké.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Adresse effective = adresse de base + décalage d'octet actuel.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #octet non signé
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
