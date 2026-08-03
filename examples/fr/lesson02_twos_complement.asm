# ==========================================================
#Leçon 02 - Complément à deux
#
#THE PROBLEM
#Un registre est composé de 32 fils, chacun haut ou bas. Il n'y a pas de fil
#pour un signe moins, les nombres négatifs doivent fonctionner.
#
#WHAT THE HARDWARE DOES
#Il lit le bit supérieur comme un signe, mais pas comme un indicateur distinct :
#-n est stocké comme modèle de bits qui, ajouté à n, revient à
#zéro. Inversez chaque bit et ajoutez-en un et vous l’avez.
#
#THE SOLUTION
#La soustraction ne nécessite pas de deuxième circuit. a - b devient
#a + (-b), donc un additionneur sert aux deux opérations.
#
#WATCH FOR
#Les deux moitiés impriment -5. Le second y parvient par le long chemin,
#avec nor et addi, montrant ce que fait le sub en interne.
#Définissez les valeurs sur hexadécimal pour voir 0xFFFFFFFB.
# ==========================================================
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
