# 07 - Mots en mémoire
#
# Les adresses mémoire comptent les octets. Chaque mot occupe quatre octets, donc `lw` et `sw`
# utilisent ici les décalages 0, 4 et 8.
#
# Une adresse de mot doit être un multiple de quatre. L'utilisation du décalage 1 au lieu de 4
# provoque une exception d'alignement dans ce programme.
#
# Après les magasins, regardez `cell` dans le segment de données. Les trois mots adjacents
# doivent contenir 111, 222 et 333.

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
