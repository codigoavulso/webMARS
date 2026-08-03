# ==========================================================
#Leçon 04 - Décalages, ou multiplication avec des fils
#
#THE PROBLEM
#Un multiplicateur général est l'un des blocs les plus chers du marché.
#un chemin de données. Multiplier par 8 ne devrait pas coûter si cher.
#
#WHAT THE HARDWARE DOES
#Un décalage n'est pas du tout arithmétique : ce sont les mêmes bits lus
#à partir de différents fils. Décalage vers la gauche de n multiplié par 2 ^ n
#et ne coûte que le routage.
#
#THE SOLUTION
#Les puissances de deux deviennent des changements. Notez les deux décalages à droite : srl
#alimente les zéros en haut, sra copie le bit de signe, donc seulement
#sra divise correctement un nombre négatif.
#
#WATCH FOR
#-16 >> 2 donne -4 avec sra mais un énorme positif avec srl. Le
#les bits se sont déplacés de manière identique ; seul ce qui est entré en haut diffère.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #Trois décalages vers la gauche se multiplient par 2^3 tout en ne conservant que 32 bits de résultat.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #Comparez $t3 et $t4 en hexadécimal pour voir les différents bits entrants.
        sra  $t3, $t2, 2        #signe conservé : -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #zéros décalés : énorme positif
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
