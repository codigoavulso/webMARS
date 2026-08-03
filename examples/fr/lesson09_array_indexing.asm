# ==========================================================
#Leçon 09 - Indexation d'un tableau
#
#THE PROBLEM
#Une instruction de chargement propose un registre de base et une constante
#décalage. Rien d'autre. Alors, comment atteint-on un[i] alors que je suis seulement
#connu au moment de l'exécution, assis dans un registre ?
#
#WHAT THE HARDWARE DOES
#Il ajoute la base à tout ce que contient le registre. L'indice
#doit donc déjà être en octets, pas en éléments.
#
#THE SOLUTION
#Redimensionnez l'index en fonction de la taille de l'élément, puis ajoutez. Pour quatre octets
#mots que la mise à l'échelle est un décalage laissé par deux, ce qui coûte
#rien.
#
#WATCH FOR
#Les trois lignes sll, add, lw correspondent à ce que a[i] compile.
#Parcourez une itération et lisez $t5 et $t6.
# ==========================================================
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
