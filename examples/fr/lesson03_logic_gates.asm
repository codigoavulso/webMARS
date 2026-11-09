# 03 - Portes logiques sur 32 bits
#
# Chaque bit de résultat dépend uniquement des bits correspondants des deux opérandes. Il n'y a
# pas de report entre les positions de bits.
#
# Avec le masque `0x0F`, AND conserve les quatre bits faibles et efface le reste. OR définit les
# quatre bits faibles et XOR les retourne.
#
# Comparez les trois résultats en hexadécimal, puis essayez le masque `0xF0` pour travailler sur
# le groupe suivant de quatre bits.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #Masque 0x0F

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND efface toutes les positions où le masque contient zéro.
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
        #XOR bascule uniquement les positions sélectionnées par celles dans le masque.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
