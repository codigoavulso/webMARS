# ==========================================================
#Leçon 03 - Portes logiques sur 32 bits
#
#THE PROBLEM
#AND, OR et XOR sont des portes à un bit. Un registre contient 32 bits.
#Que signifie un portail avec cette largeur ?
#
#WHAT THE HARDWARE DOES
#Il pose côte à côte 32 exemplaires du portail. Le bit 0 du
#le résultat dépend uniquement du bit 0 de chaque opérande, le bit 1 uniquement du
#bit 1, et ainsi de suite. Aucun transport ne se déplace entre eux.
#
#THE SOLUTION
#C'est cette indépendance qui fait qu'un masque fonctionne : choisissez lequel
#bits à conserver avec AND, forcer à un avec OR, retourner avec XOR.
#
#WATCH FOR
#0xCC est 11001100 et le masque 0x0F est 00001111. AND conserve
#les quatre bits de poids faible, OU les définit, XOR les retourne. Seul le
#le faible grignotage change toujours.
# ==========================================================
        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #Masque 0x0F

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND efface toutes les positions où le masque contient zéro.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR bascule uniquement les positions sélectionnées par celles dans le masque.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
