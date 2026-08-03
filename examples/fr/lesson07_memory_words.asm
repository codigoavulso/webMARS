# ==========================================================
#Leçon 07 - Mots en mémoire et pourquoi les adresses sautent par quatre
#
#THE PROBLEM
#La mémoire est adressée un octet à la fois, mais un registre contient
#quatre octets. Que sélectionne réellement une seule adresse ?
#
#WHAT THE HARDWARE DOES
#lw et sw déplacent quatre octets en un seul accès, donc consécutifs
#les mots sont séparés de quatre adresses. Les deux bits graves du
#l'adresse doit être nulle : cet alignement est ce qui permet au
#le matériel récupère un mot entier en un seul cycle.
#
#THE SOLUTION
#L'arithmétique des adresses se fait en octets, donc un index en mots
#est toujours échelonné par quatre.
#
#WATCH FOR
#Assemblez, puis ouvrez le segment de données à 0x10010000. Le
#trois valeurs apparaissent dans les colonnes adjacentes d'une ligne.
# ==========================================================
        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #adresse de base

        #Chaque décalage ci-dessous est relatif à $t0 et reste aligné sur le mot.
        li   $t1, 111
        sw   $t1, 0($t0)        #premier mot
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 octets = mot suivant
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 octets

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw reconstruit les mêmes valeurs 32 bits précédemment écrites par sw.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
