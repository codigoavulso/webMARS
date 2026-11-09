# 12 - Récursion et frames
#
# Un appel récursif écrase `$ra` et utilise `$a0` pour son propre argument. Enregistrez les deux
# valeurs avant de passer l'appel.
#
# Entrez `fact` pour chaque valeur de 5 à 1. Chaque appel réserve huit octets, y compris l'appel
# qui renvoie 1.
#
# Définissez un point d'arrêt sur `mul` pour surveiller le chemin de retour. Chaque appel
# recharge son propre argument, multiplie et libère sa trame.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fait(int n) ----
fact:
        #Chaque appel possède une trame distincte de huit octets.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #l'adresse de retour de cet appel
        sw   $a0, 4($sp)        #cet appel est n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #cas de base : 0 ! = 1 ! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1) !
        lw   $a0, 4($sp)        #notre n encore
        mul  $v0, $v0, $a0

factend:
        # Restaurez l'adresse de retour enregistrée avant de libérer la trame de cet appel.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
