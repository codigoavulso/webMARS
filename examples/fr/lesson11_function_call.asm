# ==========================================================
#Leçon 11 - Appeler une fonction
#
#THE PROBLEM
#Se lancer dans une routine est facile. Revenir ne l'est pas, parce que
#la même routine peut être appelée depuis de nombreux endroits et le
#L'adresse de retour diffère à chaque fois.
#
#WHAT THE HARDWARE DOES
#jal fait deux choses dans une seule instruction : il stocke le
#adresse de l'instruction suivante dans $ra, puis saute. jr
#saute à tout ce qu'un registre contient, donc jr $ra revient.
#
#THE SOLUTION
#Tout le reste est accord, pas circuit : arguments dans
#$a0..$a3, donne $v0. Brisez les conventions et le code
#s'assemble toujours - il cesse simplement d'interagir.
#
#WATCH FOR
#Montez sur le jal et lisez $ra. Comparez-le avec l'adresse
#de la ligne après l'appel dans le segment de texte.
# ==========================================================
        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #premier argument
        li   $a1, 42            #deuxième argument
        #jal modifie à la fois le flux de contrôle et $ra en une seule opération architecturale.
        jal  maxof              #$ra = adresse de la ligne suivante

        move $a0, $v0           #le résultat est revenu dans $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof est une fonction feuille, elle peut donc revenir sans enregistrer $ra sur la pile.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
