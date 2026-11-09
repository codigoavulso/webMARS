# 02 - Complément à deux
#
# Dans le complément à deux 32 bits, inverser les bits de 5 et ajouter 1 produit la
# représentation de -5.
#
# Le programme calcule la même valeur de deux manières : `sub` à partir de zéro, puis `nor` et
# `addi`.
#
# Les deux chemins impriment -5. Inspectez `0xFFFFFFFB` dans les registres pour voir à quoi
# ressemblent les mêmes bits en hexadécimal.

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #La soustraction de zéro forme l’inverse additif sans bit de signe moins.
        li   $t0, 5
        sub  $t1, $zero, $t0    #l'additionneur fait le travail
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #ni avec $zero n'est au niveau du bit NOT; l'ajout d'un complète le complément à deux.
        nor  $t2, $t0, $zero    #inverser tous les bits
        addi $t2, $t2, 1        #ajoutez-en un
        move $a0, $t2           #même valeur que ci-dessus
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
