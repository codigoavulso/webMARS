# ==========================================================
#Leçon 06 - Un compteur, en logiciel et en matériel
#
#THE PROBLEM
#Un compteur matériel est un registre, un incrémenteur et un
#comparateur. A quoi ressemble la même machine écrite
#comme instructions ?
#
#WHAT THE HARDWARE DOES
#Exactement ces trois parties, une par instruction : le registre
#détient le compte, addi est l'incrémenteur, slt avec une branche
#est le comparateur qui décide d'un autre tour.
#
#THE SOLUTION
#Une boucle n'est pas un concept nouveau. C'est une logique séquentielle orthographiée
#dehors, avec le PC comme horloge.
#
#WATCH FOR
#$t0 est le registre de comptage et $t1 la limite. Traversez
#un tour complet et nommez quelle ligne correspond à quelle partie.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #le registre de comptage
        li   $t1, 11            #la limite

loop:
        #Invariant de boucle : $t0 est la prochaine valeur à imprimer et reste en dessous de $t1.
        slt  $t2, $t0, $t1      #comparateur
        beq  $t2, $zero, endl   #quitter lorsque le nombre atteint la limite

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #La mise à jour du compteur avant de sauter garantit la progression vers la terminaison.
        addi $t0, $t0, 1        #l'additionneur
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
