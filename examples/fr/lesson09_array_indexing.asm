# 09 - Indexation d'un tableau
#
# Chaque élément du tableau occupe quatre octets. Décalez l'index vers la gauche de deux pour
# calculer son décalage d'octet.
#
# Suivez la séquence `sll`, `add`, `lw` : redimensionnez l'index, ajoutez l'adresse de base et
# chargez l'élément.
#
# À l'indice 2, `$t5` vaut 8 et `$t6` pointe vers la valeur 30. Les cinq éléments totalisent
# 150.

        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #base
        li   $t1, 0             #je
        li   $t2, 5             #longueur
        li   $t3, 0             #accumulateur

sum:
        #Invariant de boucle : $t3 est la somme de arr[0] à arr[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #je * 4 octets
        add  $t6, $t0, $t5      #base + index échelonné
        #$t6 nomme désormais exactement un élément ; lw récupère sa valeur 32 bits.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
