# 01 - Registres et immédiats
#
# L'immédiat est codé dans l'instruction. Assemblez et vérifiez quelle instruction de base
# devient chaque `li`.
#
# Parcourez les deux charges et l’ajout. Dans les registres, suivez `$t0 = 12`, `$t1 = 30` et
# `$t2 = 42`.
#
# Essayez de remplacer 30 par `0x12345678` et remontez. La constante la plus grande nécessite
# plus d’une instruction de base.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Les appels système utilisent $v0 comme sélecteur de service et $a0 comme premier argument.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li est une pseudo-instruction ; Assemble montre quelle véritable instruction il devient.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # La somme est inscrite dans un autre registre.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
