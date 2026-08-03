# ==========================================================
#Leçon 01 - Registres et valeurs immédiates
#
#THE PROBLEM
#Le ALU possède deux ports d'entrée et les deux sont câblés au
#enregistrer le fichier. Un numéro écrit dans la source n'est pas dans un
#s'inscrire, il ne peut donc pas atteindre ces ports directement.
#
#WHAT THE HARDWARE DOES
#Un voyage immédiat se déroule à l'intérieur du mot d'instruction lui-même.
#addi porte un champ de 16 bits ; Li est une commodité le
#L'assembleur se développe en une ou deux instructions réelles.
#
#THE SOLUTION
#Placez d'abord la constante dans un registre, puis laissez le ALU
#lire deux registres et en écrire un troisième.
#
#WATCH FOR
#Effectuez une étape par ligne et suivez $t0, $t1 et $t2 dans le
#Panneau des registres. Seule la troisième ligne touche le ALU.
# ==========================================================
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
        li   $t0, 12            #immédiat -> s'inscrire
        li   $t1, 30            #immédiat -> s'inscrire
        add  $t2, $t0, $t1      #ALU lit deux registres

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
